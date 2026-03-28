import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { COMPANY_BANK } from './companyLegal'

export interface ContentItem {
  id: string
  type: 'text' | 'image' | 'video' | 'link' | 'button'
  section: 'hero' | 'how-it-works' | 'cta' | 'header' | 'categories' | 'footer' | 'about' | 'privacy' | 'terms' | 'hot-goods' | 'refund'
  title: string
  content: string
  mediaUrl?: string
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  linkUrl?: string
  buttonStyle?: 'primary' | 'secondary'
  iconName?: string
  target?: '_self' | '_blank'
  // 카테고리 전용 필드들
  categoryType?: 'stickers' | 'stamps' | 'phone-cases' | 'hot-goods' | 'bundle' | 'others' | 'custom-design'
  gradientFrom?: string
  gradientTo?: string
  emoji?: string
}

// Hero 슬라이드 데이터 타입
export interface HeroSlide {
  id: string
  type: 'video' | 'image'
  src: string
  fallbackImage?: string
  title: string
  subtitle: string
  color: 'pink' | 'blue' | 'yellow' | 'purple' | 'green'
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  linkUrl?: string // 슬라이드 클릭 시 이동할 URL (모든 슬라이드에 사용 가능)
  isEventBanner?: boolean // 이벤트 배너 여부
  eventStartDate?: Date // 이벤트 시작일
  eventEndDate?: Date // 이벤트 종료일
}

// Hero 슬라이더 설정 타입
export interface HeroSliderSettings {
  autoplayDelay: number // 자동 재생 간격 (밀리초)
  effect: 'fade' | 'cube' | 'coverflow' | 'flip' // 슬라이더 효과
  loop: boolean // 루프 활성화 여부
  speed: number // 전환 속도 (밀리초)
}

// Hero 슬라이드 템플릿 타입
export interface HeroSlideTemplate {
  id: string
  name: string // 템플릿 이름
  description?: string // 템플릿 설명
  category: 'product' | 'event' | 'promotion' | 'seasonal' | 'custom' // 템플릿 카테고리
  slideData: Omit<HeroSlide, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'isActive'> // 슬라이드 데이터 (id, 날짜, 순서, 활성화 제외)
  createdAt: Date
  updatedAt: Date
  isDefault?: boolean // 기본 템플릿 여부
}

// 카테고리 데이터 타입
export interface CategoryItem {
  id: string
  title: string
  description: string
  emoji: string
  gradientFrom: string
  gradientTo: string
  backgroundImage?: string // 배경 이미지 URL
  linkUrl: string
  tags: string[]
  productCount?: number
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// 반응형 설정 타입
export interface ResponsiveSettings {
  speed?: number // 화면 크기별 애니메이션 속도 (1-10)
  opacity?: number // 화면 크기별 투명도 (0-1)
  pauseVideoOnMobile?: boolean // 모바일에서 비디오 자동 일시정지 (기본값: true)
}

// 카테고리별 Hero Slide 타입 (sliding background용)
export interface CategoryHeroSlide {
  id: string
  category: 'stickers' | 'stamps' | 'phone-cases' | 'hot-goods'
  type: 'video' | 'image'
  src: string
  fallbackImage?: string
  title?: string // 슬라이드별 제목
  subtitle?: string // 슬라이드별 부제목
  speed?: number // 애니메이션 속도 (1-10, 기본값 5) - 데스크톱 기본값
  direction?: 'left' | 'right' | 'up' | 'down' // 슬라이딩 방향 (effect가 'slide'일 때만 사용)
  effect?: 'slide' | 'fade' | 'zoom' | 'rotate' | 'blend' // 애니메이션 효과 (기본값: 'slide')
  opacity?: number // 투명도 (0-1, 기본값 0.3) - 데스크톱 기본값
  // 반응형 설정
  responsive?: {
    mobile?: ResponsiveSettings // 모바일 설정 (< 768px)
    tablet?: ResponsiveSettings // 태블릿 설정 (768px - 1024px)
    desktop?: ResponsiveSettings // 데스크톱 설정 (> 1024px)
  }
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// 서브카테고리 데이터 타입 (카테고리 페이지의 서브카테고리 카드)
export interface SubcategoryItem {
  id: string
  category: 'stickers' | 'stamps' | 'phone-cases' | 'hot-goods'
  title: string
  description: string
  emoji: string
  imageUrl?: string // 이미지 URL (Emoji 대신 사용 가능)
  linkUrl: string
  pageTitle: string // 하위 카테고리 페이지 제목 (예: "Set Stickers")
  pageSubtitle: string // 하위 카테고리 페이지 부제목
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/** Persisted localStorage may still have pre-rebrand copy; upgrade in merge + rehydrate. */
function migrateLegacyBespokeLabelsSubcategoryItems<T extends SubcategoryItem>(items: T[]): T[] {
  const legacySubtitleNeedle = 'Personalized designs tailored to your unique style and preferences'
  return items.map((item) => {
    if (item.id !== 'subcat-stickers-custom' && item.linkUrl !== '/stickers/custom') return item
    const isLegacyTitle = item.pageTitle === 'Custom Stickers'
    const isLegacySubtitle =
      typeof item.pageSubtitle === 'string' && item.pageSubtitle.includes(legacySubtitleNeedle)
    const isLegacyCardTitle = item.title === 'Custom'
    const isLegacyDesc =
      item.description === 'Personalized designs' ||
      (typeof item.description === 'string' && item.description.includes(legacySubtitleNeedle))
    if (!isLegacyTitle && !isLegacySubtitle && !isLegacyCardTitle && !isLegacyDesc) return item
    return {
      ...item,
      ...(isLegacyTitle ? { pageTitle: 'Bespoke Labels' } : {}),
      ...(isLegacySubtitle ? { pageSubtitle: 'The Ultimate Tailor-Made Sticker Experience.' } : {}),
      ...(isLegacyCardTitle ? { title: 'Bespoke Labels' } : {}),
      ...(isLegacyDesc ? { description: 'Tailor-made sticker experience' } : {}),
      updatedAt: new Date()
    } as T
  })
}

// 사이드바 메뉴 타입 정의
export interface SidebarMenuItem {
  id: string
  title: string
  type: 'link' | 'scroll' | 'disabled'
  url: string
  icon: string
  order: number
  isActive: boolean
  isComingSoon: boolean
  createdAt: Date
  updatedAt: Date
}

// 픽업 장소 타입 정의
export interface PickupLocation {
  id: string
  name: string
  address: string
  suburb: string
  state: string
  postcode: string
  country: string
  businessHours: {
    monday?: { open?: string; close?: string; closed?: boolean }
    tuesday?: { open?: string; close?: string; closed?: boolean }
    wednesday?: { open?: string; close?: string; closed?: boolean }
    thursday?: { open?: string; close?: string; closed?: boolean }
    friday?: { open?: string; close?: string; closed?: boolean }
    saturday?: { open?: string; close?: string; closed?: boolean }
    sunday?: { open?: string; close?: string; closed?: boolean }
  }
  phone?: string
  email?: string
  notes?: string
  isDefault: boolean
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// 배송 옵션 타입 정의
export interface ShippingOption {
  id: string
  name: string
  description: string
  price: number
  deliveryTime: string
  tracking: boolean
  insurance: boolean
  type: 'delivery' | 'pickup' | 'cash-on-delivery' // 배송 타입
  pickupLocationId?: string // 픽업 옵션인 경우 연결된 픽업 장소 ID
  isDefault: boolean // 기본 배송 옵션 여부
  order: number
  isActive: boolean
  // 무료 배송 관련 필드
  alwaysFree?: boolean // 항상 무료 (Cash on Delivery용)
  freeShippingWhenThresholdMet?: boolean // 기준 금액 달성 시 무료
  discountWhenThresholdMet?: number // 기준 금액 달성 시 할인 금액
  createdAt: Date
  updatedAt: Date
}

// 전역 무료 배송 설정
export interface FreeShippingSettings {
  enabled: boolean // 무료 배송 활성화 여부
  threshold: number // 무료 배송 기준 금액
  message: string // 무료 배송 메시지
}

// 은행 계좌 정보 타입 정의
export interface BankAccount {
  id: string
  bankName: string                // 은행 이름 (예: "NAB Bank")
  accountNumber: string           // 계좌 번호
  accountHolder: string           // 예금주 이름
  bsb?: string                    // BSB (호주 은행 코드)
  swiftCode?: string              // SWIFT 코드 (국제 송금용)
  accountType?: string            // 계좌 유형 (예: "Business Account")
  branchAddress?: string          // 지점 주소
  order: number                   // 표시 순서
  isActive: boolean               // 활성화 여부
  createdAt: Date
  updatedAt: Date
}

// 결제 옵션 타입 정의
export interface PaymentOption {
  id: string
  name: string                    // 결제 방법 이름 (예: "Credit Card", "PayPal")
  type: 'card' | 'paypal' | 'bank' | 'cash'  // 결제 타입
  description: string             // 결제 방법 설명
  fee: number                     // 결제 수수료 (고정 금액)
  feeType?: 'fixed' | 'percentage'  // 수수료 타입 (기본: fixed)
  feePercentage?: number          // 수수료 비율 (feeType이 percentage일 때)
  minOrderAmount?: number         // 최소 주문 금액
  maxOrderAmount?: number         // 최대 주문 금액
  requiresAuth: boolean           // 인증 필요 여부 (카드 등)
  isDefault: boolean              // 기본 결제 방법 여부
  order: number                   // 표시 순서
  isActive: boolean               // 활성화 여부
  icon?: string                   // 아이콘 이름
  bankAccounts?: BankAccount[]    // 은행 계좌 정보 (type이 'bank'일 때만 사용)
  createdAt: Date
  updatedAt: Date
}

// 프로모션 코드 타입 정의
export interface PromoCode {
  id: string
  code: string                    // 고객이 입력하는 코드 (예: "SUMMER2024")
  description: string             // 프로모션 설명
  discountType: 'percentage' | 'fixed'  // 할인 타입
  discountValue: number           // 할인 금액/비율
  minPurchaseAmount?: number      // 최소 구매 금액
  maxDiscountAmount?: number     // 최대 할인 금액 (percentage일 때)
  applicableCategories?: string[] // 적용 가능한 카테고리
  applicableProducts?: string[]   // 적용 가능한 상품 ID
  allowVIPStacking?: boolean      // VIP 등급 할인과 중복 적용 허용 (기본값: true)
  startDate: Date                 // 시작일
  endDate: Date                   // 종료일
  usageLimit?: number             // 총 사용 횟수 제한
  usageCount: number              // 현재 사용 횟수
  userUsageLimit?: number         // 사용자당 사용 횟수 제한
  isActive: boolean               // 활성화 여부
  isScheduled?: boolean           // 예약 발행 여부
  scheduledActivationDate?: Date  // 예약 활성화 날짜/시간
  createdAt: Date
  updatedAt: Date
}

// VIP 등급 기준 금액 설정 (관리자 수정 가능)
export interface VIPGradeConfig {
  id: string
  code: number               // 등급 코드 (0: Basic, 1: Silver, 2: Gold, 3: Black, 4: VVIP)
  name: string               // 한국어 등급명
  nameEn: string             // 영어 등급명
  minAmount: number          // 최소 금액 (AUD, 이 금액 이상)
  maxAmount?: number         // 최대 금액 (AUD, 이 금액 미만, undefined면 무제한)
  color: string             // UI 표시용 색상 키
  benefits: string[]         // 혜택 목록 (텍스트)
  isActive: boolean         // 활성화 여부
  createdAt: Date
  updatedAt: Date
}

// VIP 등급 혜택 설정
export interface VIPGradeBenefit {
  id: string
  gradeCode: number               // 등급 코드 (0: Basic, 1: Silver, 2: Gold, 3: Black, 4: VVIP)
  gradeName: string                // 등급명 (예: "VVIP")
  // 기본 혜택 (항상 적용)
  baseDiscountPercentage: number  // 기본 할인율 (예: 15%)
  freeShipping: boolean           // 무료 배송 여부
  maxDiscountAmount?: number      // 최대 할인 금액 (할인율 적용 시)
  minPurchaseAmount?: number      // 최소 구매 금액 (혜택 적용 조건)
  // 이벤트 혜택 (기간별)
  eventName?: string               // 이벤트명 (예: "크리스마스 특별 이벤트")
  eventStartDate?: Date            // 이벤트 시작일
  eventEndDate?: Date              // 이벤트 종료일
  eventDiscountPercentage?: number // 이벤트 추가 할인율 (기본 할인에 추가)
  eventFreeShipping?: boolean      // 이벤트 기간 무료 배송
  eventMaxDiscountAmount?: number  // 이벤트 최대 할인 금액
  // 추가 혜택 설명
  additionalBenefits: string[]     // 추가 혜택 목록 (텍스트)
  // 카테고리별 할인율 (기본 할인율에 추가)
  categoryDiscounts?: Record<string, number>  // 카테고리별 추가 할인율 (예: { "HotGoods": 5 })
  // 적용 설정
  isActive: boolean               // 활성화 여부
  priority: number                // 우선순위 (높을수록 우선 적용)
  allowPromoCodeStacking?: boolean // 프로모션 코드 할인과 중복 적용 허용 (기본값: true)
  createdAt: Date
  updatedAt: Date
}

interface ContentStore {
  _hasHydrated: boolean
  setHasHydrated: (state: boolean) => void
  contentItems: ContentItem[]
  sidebarMenuItems: SidebarMenuItem[]
  heroSlides: HeroSlide[]
  heroSliderSettings: HeroSliderSettings
  heroSlideTemplates: HeroSlideTemplate[] // Hero 슬라이드 템플릿
  categoryHeroSlides: CategoryHeroSlide[]
  categoryItems: CategoryItem[]
  subcategoryItems: SubcategoryItem[]
  pickupLocations: PickupLocation[]
  shippingOptions: ShippingOption[]
  freeShippingSettings: FreeShippingSettings // 전역 무료 배송 설정
  paymentOptions: PaymentOption[]
  promoCodes: PromoCode[]
  vipGradeConfigs: VIPGradeConfig[]
  vipGradeBenefits: VIPGradeBenefit[]
  addContent: (content: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateContent: (id: string, updates: Partial<ContentItem>) => void
  deleteContent: (id: string) => void
  toggleContentActive: (id: string) => void
  reorderContent: (section: string, newOrder: string[]) => void
  getContentBySection: (section: string) => ContentItem[]
  getActiveContentBySection: (section: string) => ContentItem[]
  // 사이드바 메뉴 관리 함수들
  addSidebarMenuItem: (item: Omit<SidebarMenuItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateSidebarMenuItem: (id: string, updates: Partial<SidebarMenuItem>) => void
  deleteSidebarMenuItem: (id: string) => void
  getActiveSidebarMenuItems: () => SidebarMenuItem[]
  reorderSidebarMenuItem: (fromIndex: number, toIndex: number) => void
  // Hero 슬라이드 관리 함수들
  addHeroSlide: (slide: Omit<HeroSlide, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateHeroSlide: (id: string, updates: Partial<HeroSlide>) => void
  deleteHeroSlide: (id: string) => void
  toggleHeroSlideActive: (id: string) => void
  reorderHeroSlide: (fromIndex: number, toIndex: number) => void
  getActiveHeroSlides: () => HeroSlide[]
  // Hero 슬라이더 설정 관리 함수들
  updateHeroSliderSettings: (settings: Partial<HeroSliderSettings>) => void
  // Hero 슬라이드 템플릿 관리 함수들
  addHeroSlideTemplate: (template: Omit<HeroSlideTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateHeroSlideTemplate: (id: string, updates: Partial<HeroSlideTemplate>) => void
  deleteHeroSlideTemplate: (id: string) => void
  getHeroSlideTemplate: (id: string) => HeroSlideTemplate | undefined
  getHeroSlideTemplatesByCategory: (category: HeroSlideTemplate['category']) => HeroSlideTemplate[]
  // 카테고리 관리 함수들
  addCategoryItem: (category: Omit<CategoryItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateCategoryItem: (id: string, updates: Partial<CategoryItem>) => void
  deleteCategoryItem: (id: string) => void
  toggleCategoryItemActive: (id: string) => void
  reorderCategoryItem: (fromIndex: number, toIndex: number) => void
  getActiveCategoryItems: () => CategoryItem[]
  // 서브카테고리 관리 함수들
  addSubcategoryItem: (subcategory: Omit<SubcategoryItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateSubcategoryItem: (id: string, updates: Partial<SubcategoryItem>) => void
  deleteSubcategoryItem: (id: string) => void
  toggleSubcategoryItemActive: (id: string) => void
  reorderSubcategoryItem: (fromIndex: number, toIndex: number) => void
  getActiveSubcategoryItems: (category: 'stickers' | 'stamps' | 'phone-cases' | 'hot-goods') => SubcategoryItem[]
  // 카테고리별 Hero Slide 관리 함수들
  addCategoryHeroSlide: (slide: Omit<CategoryHeroSlide, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateCategoryHeroSlide: (id: string, updates: Partial<CategoryHeroSlide>) => void
  deleteCategoryHeroSlide: (id: string) => void
  toggleCategoryHeroSlideActive: (id: string) => void
  reorderCategoryHeroSlide: (category: 'stickers' | 'stamps' | 'phone-cases' | 'hot-goods', fromIndex: number, toIndex: number) => void
  getActiveCategoryHeroSlides: (category: 'stickers' | 'stamps' | 'phone-cases' | 'hot-goods') => CategoryHeroSlide[]
  // 픽업 장소 관리 함수들
  addPickupLocation: (location: Omit<PickupLocation, 'id' | 'createdAt' | 'updatedAt'>) => void
  updatePickupLocation: (id: string, updates: Partial<PickupLocation>) => void
  deletePickupLocation: (id: string) => void
  togglePickupLocationActive: (id: string) => void
  getDefaultPickupLocation: () => PickupLocation | undefined
  getActivePickupLocations: () => PickupLocation[]
  // 배송 옵션 관리 함수들
  addShippingOption: (option: Omit<ShippingOption, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateShippingOption: (id: string, updates: Partial<ShippingOption>) => void
  deleteShippingOption: (id: string) => void
  toggleShippingOptionActive: (id: string) => void
  getDefaultShippingOption: () => ShippingOption | undefined
  getActiveShippingOptions: () => ShippingOption[]
  getShippingOption: (id: string) => ShippingOption | undefined
  // 전역 무료 배송 설정 관리 함수들
  updateFreeShippingSettings: (settings: Partial<FreeShippingSettings>) => void
  getFreeShippingSettings: () => FreeShippingSettings
  // 결제 옵션 관리 함수들
  addPaymentOption: (option: Omit<PaymentOption, 'id' | 'createdAt' | 'updatedAt'>) => void
  updatePaymentOption: (id: string, updates: Partial<PaymentOption>) => void
  deletePaymentOption: (id: string) => void
  togglePaymentOptionActive: (id: string) => void
  getDefaultPaymentOption: () => PaymentOption | undefined
  getActivePaymentOptions: () => PaymentOption[]
  getPaymentOption: (id: string) => PaymentOption | undefined
  getPaymentOptionByType: (type: 'card' | 'paypal' | 'bank' | 'cash') => PaymentOption | undefined
  // 프로모션 코드 관리 함수들
  addPromoCode: (code: Omit<PromoCode, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void
  updatePromoCode: (id: string, updates: Partial<PromoCode>) => void
  deletePromoCode: (id: string) => void
  togglePromoCodeActive: (id: string) => void
  getActivePromoCodes: () => PromoCode[]
  getPromoCode: (id: string) => PromoCode | undefined
  getPromoCodeByCode: (code: string) => PromoCode | undefined
  validatePromoCode: (code: string, subtotal: number, cartItems?: Array<{ productId: string; category?: string }>, userId?: string, orders?: Array<{ promoCode?: string; customer: { email?: string; phone?: string; id?: string }; userId?: string; status?: string }>, userEmail?: string, userPhone?: string) => { valid: boolean; promoCode?: PromoCode; error?: string }
  applyPromoCode: (code: string, subtotal: number, cartItems?: Array<{ productId: string; category?: string }>) => { discount: number; promoCode: PromoCode } | null
  incrementPromoCodeUsage: (id: string) => void
  activateScheduledPromoCodes: () => void
  // VIP 등급 혜택 관리 함수들
  addVIPGradeBenefit: (benefit: Omit<VIPGradeBenefit, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateVIPGradeBenefit: (id: string, updates: Partial<VIPGradeBenefit>) => void
  deleteVIPGradeBenefit: (id: string) => void
  toggleVIPGradeBenefitActive: (id: string) => void
  getVIPGradeBenefit: (gradeCode: number) => VIPGradeBenefit | undefined
  getActiveVIPGradeBenefit: (gradeCode: number) => VIPGradeBenefit | undefined
  getVIPGradeBenefitForCheckout: (
    gradeCode: number,
    subtotal: number,
    cartItems?: Array<{ productId: string; category?: string; price: number }>,
    currentDate?: Date
  ) => { discount: number; freeShipping: boolean; benefit: VIPGradeBenefit } | null
  getActiveVIPGradeConfigs: () => VIPGradeConfig[]
  // VIP 등급 기준 금액 관리 함수들
  addVIPGradeConfig: (config: Omit<VIPGradeConfig, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateVIPGradeConfig: (id: string, updates: Partial<VIPGradeConfig>) => void
  deleteVIPGradeConfig: (id: string) => void
  toggleVIPGradeConfigActive: (id: string) => void
  getVIPGradeConfig: (gradeCode: number) => VIPGradeConfig | undefined
  resetToDefault: () => void
  updateDefaultSidebarMenu: () => void
}

const defaultContent: ContentItem[] = [
  // 헤더 섹션 콘텐츠
  {
    id: 'header-1',
    type: 'text',
    section: 'header',
    title: 'Company Name',
    content: 'SELPIC',
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'header-logo',
    type: 'image',
    section: 'header',
    title: 'Logo Image',
    content: '',
    mediaUrl: '',
    linkUrl: '/',
    order: 0.5,
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'header-2',
    type: 'link',
    section: 'header',
    title: 'Home Link',
    content: 'Home',
    linkUrl: '/',
    order: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'header-3',
    type: 'link',
    section: 'header',
    title: 'Stickers Link',
    content: 'Stickers',
    linkUrl: '/stickers',
    order: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'header-4',
    type: 'button',
    section: 'header',
    title: 'Login Button',
    content: 'Login',
    buttonStyle: 'primary',
    linkUrl: '/login',
    order: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'header-5',
    type: 'button',
    section: 'header',
    title: 'Cart Button',
    content: 'Cart',
    buttonStyle: 'secondary',
    iconName: 'ShoppingCart',
    order: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'header-6',
    type: 'button',
    section: 'header',
    title: 'Search Button Enabled',
    content: 'true',
    order: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'header-7',
    type: 'button',
    section: 'header',
    title: 'Language Selector Enabled',
    content: 'true',
    order: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // 기존 Hero 섹션 콘텐츠
  {
    id: '1',
    type: 'text',
    section: 'hero',
    title: 'SELPIC Main Title',
    content: 'SELPIC',
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },

  {
    id: '4',
    type: 'image',
    section: 'hero',
    title: 'Hero Background Image',
    content: 'Hero section background image',
    mediaUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    order: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '5',
    type: 'video',
    section: 'hero',
    title: 'Hero Video',
    content: 'Hero section background video',
    mediaUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
    order: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },



  {
    id: '12',
    type: 'text',
    section: 'cta',
    title: 'Get Started',
    content: 'Create your own stickers!',
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '13',
    type: 'image',
    section: 'cta',
    title: 'CTA Background Image',
    content: 'CTA section background image',
    mediaUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop',
    order: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // How It Works 데이터
  {
    id: 'how-1',
    type: 'text',
    section: 'how-it-works',
    title: 'How It Works Title',
    content: 'How It Works',
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'how-3',
    type: 'text',
    section: 'how-it-works',
    title: 'Step 1 Title',
    content: 'Choose Your Design',
    order: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'how-4',
    type: 'text',
    section: 'how-it-works',
    title: 'Step 1 Description',
    content: 'Select from our templates or upload your own design',
    order: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'how-5',
    type: 'text',
    section: 'how-it-works',
    title: 'Step 2 Title',
    content: 'Customize & Preview',
    order: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'how-6',
    type: 'text',
    section: 'how-it-works',
    title: 'Step 2 Description',
    content: 'Adjust colors, text, and layout to match your vision',
    order: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'how-7',
    type: 'text',
    section: 'how-it-works',
    title: 'Step 3 Title',
    content: 'Order & Receive',
    order: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'how-8',
    type: 'text',
    section: 'how-it-works',
    title: 'Step 3 Description',
    content: 'Place your order and receive high-quality stickers',
    order: 8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Footer 데이터
  {
    id: 'footer-1',
    type: 'text',
    section: 'footer',
    title: 'Company Name',
    content: 'SELPIC',
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'footer-2',
    type: 'text',
    section: 'footer',
    title: 'Company Description',
    content: 'Your digital sticker journey starts here. Customize and print your own stickers with ease.',
    order: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'footer-3',
    type: 'text',
    section: 'footer',
    title: 'Quick Links Title',
    content: 'Quick Links',
    order: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'footer-4',
    type: 'text',
    section: 'footer',
    title: 'Help/Useful Links Title',
    content: 'Help/Useful Links',
    order: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'footer-4-subtitle',
    type: 'text',
    section: 'footer',
    title: 'Social Media Subtitle',
    content: '',
    order: 4.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'footer-5',
    type: 'link',
    section: 'footer',
    title: 'Instagram Link',
    content: 'Instagram',
    linkUrl: '#',
    order: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'footer-6',
    type: 'link',
    section: 'footer',
    title: 'Facebook Link',
    content: 'Facebook',
    linkUrl: '#',
    order: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'footer-7',
    type: 'link',
    section: 'footer',
    title: 'Twitter Link',
    content: 'Twitter',
    linkUrl: '#',
    order: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'footer-8',
    type: 'text',
    section: 'footer',
    title: 'Newsletter Title',
    content: 'Newsletter',
    order: 8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'footer-9',
    type: 'text',
    section: 'footer',
    title: 'Newsletter Description',
    content: 'Subscribe to our newsletter for updates.',
    order: 9,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'footer-10',
    type: 'text',
    section: 'footer',
    title: 'Copyright Information',
    content: 'SELPIC',
    order: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'footer-11',
    type: 'link',
    section: 'footer',
    title: 'Privacy Policy Link',
    content: 'Privacy Policy',
    linkUrl: '/privacy',
    order: 11,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'footer-12',
    type: 'link',
    section: 'footer',
    title: 'Terms and Conditions Link',
    content: 'Terms and Conditions',
    linkUrl: '/terms',
    order: 12,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // About Us 페이지 데이터
  {
    id: 'about-1',
    type: 'text',
    section: 'about',
    title: 'Hero Title',
    content: 'About Us',
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-2',
    type: 'text',
    section: 'about',
    title: 'Hero Subtitle',
    content: 'Your digital sticker journey starts here. Customize and print your own stickers with ease.',
    order: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-3',
    type: 'text',
    section: 'about',
    title: 'Hero Browse Button',
    content: 'Sticker Products',
    order: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-4',
    type: 'text',
    section: 'about',
    title: 'Hero Customize Button',
    content: 'Stamp Products',
    order: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-4-link',
    type: 'link',
    section: 'about',
    title: 'Hero Browse Button Link',
    content: 'Hero Browse button link',
    linkUrl: '/stickers',
    order: 4.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-4-link-2',
    type: 'link',
    section: 'about',
    title: 'Hero Customize Button Link',
    content: 'Hero Customize button link',
    linkUrl: '/stamp',
    order: 4.6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-5',
    type: 'text',
    section: 'about',
    title: 'Company Story Title',
    content: 'Our Story',
    order: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-6',
    type: 'text',
    section: 'about',
    title: 'Company Story First Paragraph',
    content: 'SELPIC was born from a simple idea: everyone deserves to express their creativity through high-quality, personalized stickers. We started as a small team of designers and developers who were passionate about making custom printing accessible to everyone.',
    order: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-7',
    type: 'text',
    section: 'about',
    title: 'Company Story Second Paragraph',
    content: 'Today, we have grown into a trusted platform that serves thousands of customers worldwide. Our commitment to quality, innovation, and customer satisfaction has made us a leader in the custom sticker industry.',
    order: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-8',
    type: 'text',
    section: 'about',
    title: 'Company Story Third Paragraph',
    content: 'We believe that every idea deserves to be brought to life, and we are here to help you turn your creative visions into beautiful, durable stickers that you can be proud of.',
    order: 8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-9',
    type: 'text',
    section: 'about',
    title: 'Why SELPIC Title',
    content: 'Why SELPIC?',
    order: 9,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-10',
    type: 'text',
    section: 'about',
    title: 'Why SELPIC Subtitle',
    content: 'We deliver customer satisfaction with the highest quality and service',
    order: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-11',
    type: 'text',
    section: 'about',
    title: 'Superior Quality Title',
    content: 'Superior Quality',
    order: 11,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-12',
    type: 'text',
    section: 'about',
    title: 'Superior Quality Description',
    content: 'We guarantee perfect quality with cutting-edge technology. All products undergo rigorous quality testing before reaching our customers.',
    order: 12,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-13',
    type: 'text',
    section: 'about',
    title: 'Customer Satisfaction Title',
    content: 'Customer Satisfaction',
    order: 13,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-14',
    type: 'text',
    section: 'about',
    title: 'Customer Satisfaction Description',
    content: 'We guarantee a full refund if you are not 100% satisfied. Customer satisfaction is our top priority.',
    order: 14,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-15',
    type: 'text',
    section: 'about',
    title: "SELPIC's Promise Title",
    content: 'SELPIC\'s Promise',
    order: 15,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-16',
    type: 'text',
    section: 'about',
    title: "SELPIC's Promise Description",
    content: 'We are not just selling products, but serving as a partner to bring your creative ideas to life. Delivering customer satisfaction through the highest quality and service is SELPIC\'s core value.',
    order: 16,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-17',
    type: 'text',
    section: 'about',
    title: 'Values Section Title',
    content: 'Our Values',
    order: 17,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-18',
    type: 'text',
    section: 'about',
    title: 'Values Section Subtitle',
    content: 'What drives us every day',
    order: 18,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-19',
    type: 'text',
    section: 'about',
    title: 'Innovation Title',
    content: 'Innovation',
    order: 19,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-20',
    type: 'text',
    section: 'about',
    title: 'Innovation Description',
    content: 'We constantly push the boundaries of what\'s possible in custom printing technology.',
    order: 20,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-21',
    type: 'text',
    section: 'about',
    title: 'Quality Values Title',
    content: 'Quality',
    order: 21,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-22',
    type: 'text',
    section: 'about',
    title: 'Quality Values Description',
    content: 'Every product meets our strict quality standards before reaching our customers.',
    order: 22,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-23',
    type: 'text',
    section: 'about',
    title: 'Customer Values Title',
    content: 'Customer First',
    order: 23,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-24',
    type: 'text',
    section: 'about',
    title: 'Customer Values Description',
    content: 'Your satisfaction is our top priority, and we go above and beyond to exceed your expectations.',
    order: 24,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-25',
    type: 'text',
    section: 'about',
    title: 'Team Section Title',
    content: 'Meet Our Team',
    order: 25,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-26',
    type: 'text',
    section: 'about',
    title: 'Team Section Subtitle',
    content: 'The passionate people behind SELPIC',
    order: 26,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-27',
    type: 'text',
    section: 'about',
    title: 'Design Team Title',
    content: 'Design Team',
    order: 27,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-28',
    type: 'text',
    section: 'about',
    title: 'Design Team Description',
    content: 'Creative minds who bring your ideas to life',
    order: 28,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-29',
    type: 'text',
    section: 'about',
    title: 'Production Team Title',
    content: 'Production Team',
    order: 29,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-30',
    type: 'text',
    section: 'about',
    title: 'Production Team Description',
    content: 'Experts who ensure every product meets our quality standards',
    order: 30,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-31',
    type: 'text',
    section: 'about',
    title: 'Support Team Title',
    content: 'Support Team',
    order: 31,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-32',
    type: 'text',
    section: 'about',
    title: 'Support Team Description',
    content: 'Dedicated professionals who are here to help you succeed',
    order: 32,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-33',
    type: 'text',
    section: 'about',
    title: 'Mission Section Title',
    content: 'Our Mission',
    order: 33,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-34',
    type: 'text',
    section: 'about',
    title: 'Mission Section Description',
    content: 'To empower creativity and self-expression through high-quality, personalized stickers that bring your ideas to life.',
    order: 34,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-35',
    type: 'text',
    section: 'about',
    title: 'Global Reach Title',
    content: 'Global Reach',
    order: 35,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-36',
    type: 'text',
    section: 'about',
    title: 'Global Reach Description',
    content: 'Serving customers worldwide with fast, reliable shipping and exceptional quality.',
    order: 36,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-37',
    type: 'text',
    section: 'about',
    title: 'Mission Innovation Title',
    content: 'Innovation',
    order: 37,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-38',
    type: 'text',
    section: 'about',
    title: 'Mission Innovation Description',
    content: 'Continuously improving our technology and processes to deliver the best possible results.',
    order: 38,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-39',
    type: 'text',
    section: 'about',
    title: 'Sustainability Title',
    content: 'Sustainability',
    order: 39,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-40',
    type: 'text',
    section: 'about',
    title: 'Sustainability Description',
    content: 'Committed to eco-friendly materials and sustainable business practices.',
    order: 40,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-41',
    type: 'text',
    section: 'about',
    title: 'CTA Section Title',
    content: 'Ready to Create?',
    order: 41,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-42',
    type: 'text',
    section: 'about',
    title: 'CTA Section Description',
    content: 'Start your creative journey today and bring your ideas to life with our premium custom stickers.',
    order: 42,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-43',
    type: 'text',
    section: 'about',
    title: 'CTA Start Creating Button',
    content: 'Phone Case',
    order: 43,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-44',
    type: 'text',
    section: 'about',
    title: 'CTA Browse Products Button',
    content: 'Hot Products',
    order: 44,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-43-link',
    type: 'link',
    section: 'about',
    title: 'CTA Start Creating Button Link',
    content: 'CTA Start Creating button link',
    linkUrl: '/phone-cases',
    order: 43.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'about-44-link',
    type: 'link',
    section: 'about',
    title: 'CTA Browse Products Button Link',
    content: 'CTA Browse Products button link',
    linkUrl: '/hot-goods',
    order: 44.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Privacy Policy 페이지 데이터
  {
    id: 'privacy-1',
    type: 'text',
    section: 'privacy',
    title: 'Privacy Policy Title',
    content: 'SELPIC Privacy Policy',
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-2',
    type: 'text',
    section: 'privacy',
    title: 'Privacy Policy Subtitle',
    content: 'Effective Date: December 2025 (Last Updated: December 2025)',
    order: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-3',
    type: 'text',
    section: 'privacy',
    title: 'Introduction Title',
    content: '1. Introduction and Commitment',
    order: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-4',
    type: 'text',
    section: 'privacy',
    title: 'Introduction Content',
    content: 'At SELPIC, we are committed to protecting your privacy and ensuring the security of your personal information in accordance with the Australian Privacy Principles (APPs) set out in the Privacy Act 1988 (Cth). This Privacy Policy explains how we manage your personal information when you use our services.',
    order: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-5',
    type: 'text',
    section: 'privacy',
    title: 'Information We Collect Title',
    content: '2. Personal Information We Collect',
    order: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-5a',
    type: 'text',
    section: 'privacy',
    title: 'Information We Collect Description',
    content: 'We only collect personal information that is reasonably necessary for us to provide our services and manage our business operations.',
    order: 5.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-5b',
    type: 'text',
    section: 'privacy',
    title: '2. Personal Information We Collect Content',
    content: 'Payment Information: Payment details are processed securely by third-party payment gateways; we do not store full payment card details. Usage Information: Website usage patterns, product preferences, IP address, device, and browser information.',
    order: 5.7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-5c',
    type: 'text',
    section: 'privacy',
    title: 'Personal Information List',
    content: 'Identity and Contact Information: Name, email address, phone number, and social media handles.',
    order: 5.8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-6',
    type: 'text',
    section: 'privacy',
    title: 'Personal Information Title',
    content: 'Personal Information',
    order: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-7',
    type: 'text',
    section: 'privacy',
    title: 'FIRST LIST',
    content: 'Identity and Contact Information: Name, email address, phone number, and social media handles',
    order: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-7a',
    type: 'text',
    section: 'privacy',
    title: 'SECOND LIST',
    content: 'Transaction Information: Shipping and billing addresses, and records of products purchased',
    order: 7.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-7b',
    type: 'text',
    section: 'privacy',
    title: 'THIRD LIST',
    content: 'Payment Information: Payment details are processed securely by third-party payment gateways; we do not store full payment card details',
    order: 7.7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-8',
    type: 'text',
    section: 'privacy',
    title: 'Usage Information Title',
    content: 'Usage Information',
    order: 8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-9',
    type: 'text',
    section: 'privacy',
    title: 'FOURTH LIST',
    content: 'Website usage patterns, Product preferences',
    order: 9,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-10',
    type: 'text',
    section: 'privacy',
    title: 'How We Use Information Title',
    content: 'How We Use Your Information',
    order: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-11',
    type: 'text',
    section: 'privacy',
    title: 'How We Use Information List',
    content: 'To process and fulfill your orders and manage payment transactions, To provide necessary customer support and send essential order updates and notifications, To improve our products, services, and website experience (e.g., through analytics), To personalize your shopping experience and recommend products relevant to your preferences, To comply with legal obligations and prevent fraudulent activity',
    order: 11,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-12',
    type: 'text',
    section: 'privacy',
    title: 'Data Security Title',
    content: '7. Data Quality and Security (APPs 10 & 11)',
    order: 12,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-13',
    type: 'text',
    section: 'privacy',
    title: 'Data Security Description',
    content: 'We implement industry-standard security measures to protect your personal information:',
    order: 13,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-14',
    type: 'text',
    section: 'privacy',
    title: 'Data Security List',
    content: 'SSL encryption for all data transmission, Secure payment processing, Regular security audits, Limited access to personal data, Secure data storage and backup',
    order: 14,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-15',
    type: 'text',
    section: 'privacy',
    title: 'Your Rights Title',
    content: 'Your Rights',
    order: 15,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-16',
    type: 'text',
    section: 'privacy',
    title: 'Your Rights Description',
    content: 'You have the following rights regarding your personal information:',
    order: 16,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-17',
    type: 'text',
    section: 'privacy',
    title: 'Your Rights List',
    content: 'Access your personal data, Correct inaccurate information, Delete your personal data, Object to data processing, Data portability, Withdraw consent',
    order: 17,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-18',
    type: 'text',
    section: 'privacy',
    title: 'Contact Information Title',
    content: 'Contact Us',
    order: 18,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-19',
    type: 'text',
    section: 'privacy',
    title: 'Contact Information Description',
    content: 'If you have any questions about this Privacy Policy or our data practices, please contact us:',
    order: 19,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-20',
    type: 'text',
    section: 'privacy',
    title: 'Contact Email',
    content: 'info@selpic.com.au',
    order: 20,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-21',
    type: 'text',
    section: 'privacy',
    title: 'Contact Phone',
    content: '+61 0466894279',
    order: 21,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-22',
    type: 'text',
    section: 'privacy',
    title: 'Contact Address',
    content: 'Harvest St, Mansfield QLD 4122',
    order: 22,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-23',
    type: 'text',
    section: 'privacy',
    title: 'How We Collect Information Title',
    content: '3. How We Collect Information',
    order: 23,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-23a',
    type: 'text',
    section: 'privacy',
    title: 'How We Collect Information Description',
    content: 'We collect personal information directly from you when you interact with our services.',
    order: 23.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-23b',
    type: 'text',
    section: 'privacy',
    title: 'How We Collect Information Description 2',
    content: '',
    order: 23.7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-24',
    type: 'text',
    section: 'privacy',
    title: 'How We Collect Information List',
    content: 'Place an order through our website, Create an account on our website, Contact us for customer support or inquiries, Subscribe to our newsletter or marketing communications, We may also collect non-personal information automatically through cookies and similar tracking technologies as you browse our website',
    order: 24,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-25',
    type: 'text',
    section: 'privacy',
    title: 'Purpose of Collection and Use Title',
    content: '4. Purpose of Collection and Use (Why We Need Your Data)',
    order: 25,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-25a',
    type: 'text',
    section: 'privacy',
    title: 'Purpose of Collection and Use Description',
    content: 'We use your personal information for the following primary purposes:',
    order: 25.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-26',
    type: 'text',
    section: 'privacy',
    title: 'Direct Marketing Title',
    content: '5. Direct Marketing (APP 7)',
    order: 26,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-26a',
    type: 'text',
    section: 'privacy',
    title: 'Direct Marketing Description',
    content: 'We may use your personal information to send you information about new products, special offers, and services we believe may be of interest to you.',
    order: 26.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-27',
    type: 'text',
    section: 'privacy',
    title: 'Direct Marketing List',
    content: 'We may use your personal information (such as your email address) to send you information about new products, special offers, and services we believe may be of interest to you, Opting Out: You can opt-out of receiving these marketing communications at any time by clicking the Unsubscribe link provided in the email or by contacting us directly (see Section 10)',
    order: 27,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-28',
    type: 'text',
    section: 'privacy',
    title: 'Disclosure to Third Parties Title',
    content: '6. Disclosure to Third Parties',
    order: 28,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-28a',
    type: 'text',
    section: 'privacy',
    title: 'Disclosure to Third Parties Description',
    content: 'We may disclose your personal information to third parties who assist us in providing our services, including:',
    order: 28.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-29',
    type: 'text',
    section: 'privacy',
    title: 'Disclosure to Third Parties List',
    content: 'Shipping and Logistics Providers (to deliver your orders), Payment Processors (to handle secure transactions), IT Service Providers (for data storage and website hosting), Overseas Disclosure: We may use third-party service providers located overseas (e.g., cloud hosting services) for data storage and processing. By providing your personal information, you consent to the disclosure of your information to these overseas recipients. We take reasonable steps to ensure that these overseas recipients comply with the APPs',
    order: 29,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-29a',
    type: 'text',
    section: 'privacy',
    title: 'Disclosure to Third Parties Description 2',
    content: '',
    order: 29.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-30',
    type: 'text',
    section: 'privacy',
    title: 'Access and Correction Title',
    content: '8. Access and Correction (APPs 12 & 13)',
    order: 30,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-31',
    type: 'text',
    section: 'privacy',
    title: 'Making a Complaint Title',
    content: '9. Making a Complaint',
    order: 31,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-31a',
    type: 'text',
    section: 'privacy',
    title: 'Making a Complaint Description',
    content: 'If you believe we have breached the Australian Privacy Principles, you have the right to make a formal complaint.',
    order: 31.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'privacy-32',
    type: 'text',
    section: 'privacy',
    title: 'Making a Complaint List',
    content: 'Complaint Procedure: Please contact us in writing, detailing the nature of your complaint. We will investigate and respond within 30 days, External Complaint: If you are not satisfied with our response, you may refer your complaint to the Office of the Australian Information Commissioner (OAIC)',
    order: 32,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Terms and Conditions 페이지 데이터
  {
    id: 'terms-1',
    type: 'text',
    section: 'terms',
    title: 'Terms and Conditions Title',
    content: 'Terms and Conditions',
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-2',
    type: 'text',
    section: 'terms',
    title: 'Terms and Conditions Subtitle',
    content: 'Last updated: September 3, 2025',
    order: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-3',
    type: 'text',
    section: 'terms',
    title: 'Agreement to Terms Title',
    content: 'Agreement to Terms',
    order: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-4',
    type: 'text',
    section: 'terms',
    title: 'Agreement to Terms Content',
    content: 'By accessing and using SELPIC\'s services, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.',
    order: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-5',
    type: 'text',
    section: 'terms',
    title: 'Use of Service Title',
    content: 'Use of Service',
    order: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-6',
    type: 'text',
    section: 'terms',
    title: 'Permitted Uses Title',
    content: 'Permitted Uses',
    order: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-7',
    type: 'text',
    section: 'terms',
    title: 'Permitted Uses List',
    content: 'Browse and purchase our products, Create custom sticker designs, Access customer support, Participate in our community',
    order: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-8',
    type: 'text',
    section: 'terms',
    title: 'Prohibited Uses Title',
    content: 'Prohibited Uses',
    order: 8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-8a',
    type: 'text',
    section: 'terms',
    title: 'Prohibited Uses Content',
    content: '',
    order: 8.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-9',
    type: 'text',
    section: 'terms',
    title: 'Prohibited Uses List',
    content: 'Violate any applicable laws or regulations, Infringe on intellectual property rights, Upload malicious content or viruses, Attempt to gain unauthorized access',
    order: 9,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-10',
    type: 'text',
    section: 'terms',
    title: 'Orders and Payment Title',
    content: 'Orders and Payment',
    order: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-11',
    type: 'text',
    section: 'terms',
    title: 'Order Processing Title',
    content: 'Order Processing',
    order: 11,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-12',
    type: 'text',
    section: 'terms',
    title: 'Order Processing List',
    content: 'All orders are subject to acceptance and availability, We reserve the right to refuse or cancel orders, Order confirmation will be sent via email, Processing time: 1-3 business days',
    order: 12,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-13',
    type: 'text',
    section: 'terms',
    title: 'Payment Terms Title',
    content: 'Payment Terms',
    order: 13,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-14',
    type: 'text',
    section: 'terms',
    title: 'Payment Terms List',
    content: 'Payment is required at the time of order, We accept major credit cards and PayPal, All prices are in USD and include applicable taxes, Refunds processed within 5-10 business days',
    order: 14,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-15',
    type: 'text',
    section: 'terms',
    title: 'Intellectual Property Title',
    content: 'Intellectual Property',
    order: 15,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-16',
    type: 'text',
    section: 'terms',
    title: 'SELPIC Rights Title',
    content: 'SELPIC\'s Rights',
    order: 16,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-17',
    type: 'text',
    section: 'terms',
    title: 'SELPIC Rights Content',
    content: 'All content, designs, and materials on our platform are owned by SELPIC or our licensors. This includes but is not limited to logos, graphics, text, and software.',
    order: 17,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-18',
    type: 'text',
    section: 'terms',
    title: 'User Content Title',
    content: 'User Content',
    order: 18,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-19',
    type: 'text',
    section: 'terms',
    title: 'User Content List',
    content: 'By uploading content, you grant SELPIC a non-exclusive license to use, modify, and display your content for the purpose of providing our services.',
    order: 19,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-20',
    type: 'text',
    section: 'terms',
    title: 'Limitation of Liability Title',
    content: 'Limitation of Liability',
    order: 20,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-21',
    type: 'text',
    section: 'terms',
    title: 'Limitation of Liability Content',
    content: 'To the maximum extent permitted by law, SELPIC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services.',
    order: 21,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-22',
    type: 'text',
    section: 'terms',
    title: 'Limitation of Liability List',
    content: 'Our total liability shall not exceed the amount paid by you for the specific product or service.',
    order: 22,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-22a',
    type: 'text',
    section: 'terms',
    title: 'Limitation of Liability 내용2',
    content: '',
    order: 22.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-22b',
    type: 'text',
    section: 'terms',
    title: 'Limitation of Liability List 2',
    content: '',
    order: 22.7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-23',
    type: 'text',
    section: 'terms',
    title: 'Returns and Refunds Title',
    content: 'Returns and Refunds',
    order: 23,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-24',
    type: 'text',
    section: 'terms',
    title: 'Return Policy Title',
    content: 'Return Policy',
    order: 24,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-25',
    type: 'text',
    section: 'terms',
    title: 'Return Policy List',
    content: '30-day return window from delivery date, Items must be in original condition, Custom products are non-returnable, Return shipping costs are customer\'s responsibility',
    order: 25,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-26',
    type: 'text',
    section: 'terms',
    title: 'Refund Process Title',
    content: 'Refund Process',
    order: 26,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-27',
    type: 'text',
    section: 'terms',
    title: 'Refund Process List',
    content: 'Refunds processed within 5-10 business days, Original payment method will be credited, Processing fees may apply, Contact customer service for assistance',
    order: 27,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-28',
    type: 'text',
    section: 'terms',
    title: 'Changes to Terms Title',
    content: 'Changes to Terms',
    order: 28,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-29',
    type: 'text',
    section: 'terms',
    title: 'Changes to Terms Content',
    content: 'We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of our services constitutes acceptance of the modified terms.',
    order: 29,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-30',
    type: 'text',
    section: 'terms',
    title: 'Governing Law Title',
    content: '8. Governing Law',
    order: 30,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-30a',
    type: 'text',
    section: 'terms',
    title: 'Governing Law Content',
    content: '',
    order: 30.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-30b',
    type: 'text',
    section: 'terms',
    title: 'Governing Law List',
    content: '',
    order: 30.7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-31',
    type: 'text',
    section: 'terms',
    title: 'Contact Information Title',
    content: 'Contact Us',
    order: 31,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-31',
    type: 'text',
    section: 'terms',
    title: 'Contact Information Description',
    content: 'If you have any questions about these Terms and Conditions, please contact us:',
    order: 31.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-32',
    type: 'text',
    section: 'terms',
    title: 'Contact Email',
    content: 'legal@selpic.com',
    order: 32,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-33',
    type: 'text',
    section: 'terms',
    title: 'Contact Phone',
    content: '+1 (555) 123-4567',
    order: 33,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'terms-34',
    type: 'text',
    section: 'terms',
    title: 'Contact Address',
    content: '123 Sticker Street, Design City, DC 12345',
    order: 34,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Market S 페이지 데이터
  {
    id: 'hot-goods-1',
    type: 'text',
    section: 'hot-goods',
    title: 'Page Title',
    content: 'Market S',
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'hot-goods-2',
    type: 'text',
    section: 'hot-goods',
    title: 'Hero Title',
    content: 'Market S',
    order: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'hot-goods-3',
    type: 'text',
    section: 'hot-goods',
    title: 'Hero Feature 1',
    content: 'Limited Edition',
    order: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'hot-goods-4',
    type: 'text',
    section: 'hot-goods',
    title: 'Hero Feature 2',
    content: 'Trending Now',
    order: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'hot-goods-5',
    type: 'text',
    section: 'hot-goods',
    title: 'Hero Feature 3',
    content: 'Fast Selling',
    order: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'hot-goods-6',
    type: 'text',
    section: 'hot-goods',
    title: 'Search Placeholder',
    content: 'Search hot goods...',
    order: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'hot-goods-7',
    type: 'text',
    section: 'hot-goods',
    title: 'Filter Button',
    content: 'Filter',
    order: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'hot-goods-8',
    type: 'text',
    section: 'hot-goods',
    title: 'No Results Message',
    content: 'No hot goods found matching your search criteria.',
    order: 8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'hot-goods-9',
    type: 'text',
    section: 'hot-goods',
    title: 'No Results Submessage',
    content: 'Try different search terms or filters.',
    order: 9,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // 카테고리 데이터
  {
    id: 'cat-1',
    type: 'button',
    section: 'categories',
    title: 'Stickers',
    content: 'Express yourself with our premium sticker collection',
    linkUrl: '/stickers',
    categoryType: 'stickers',
    gradientFrom: '#3B82F6',
    gradientTo: '#8B5CF6',
    emoji: '🏷️',
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'cat-2',
    type: 'button',
    section: 'categories',
    title: 'Stamps',
    content: 'Professional quality stamps for every occasion',
    linkUrl: '/stamp',
    categoryType: 'stamps',
    gradientFrom: '#10B981',
    gradientTo: '#14B8A6',
    emoji: '📮',
    order: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'cat-3',
    type: 'button',
    section: 'categories',
    title: 'Phone Cases',
    content: 'Protect your device with style and personality',
    linkUrl: '/phone-cases',
    categoryType: 'phone-cases',
    gradientFrom: '#8B5CF6',
    gradientTo: '#EC4899',
    emoji: '📱',
    order: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'cat-4',
    type: 'button',
    section: 'categories',
    title: 'Market S',
    content: 'Trending and limited edition items',
    linkUrl: '/hot-goods',
    categoryType: 'hot-goods',
    gradientFrom: '#EF4444',
    gradientTo: '#F97316',
    emoji: '🔥',
    order: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'cat-5',
    type: 'button',
    section: 'categories',
    title: 'SELPIC N',
    content: 'Community space to share and inspire',
    linkUrl: '/community',
    categoryType: 'others',
    gradientFrom: '#6B7280',
    gradientTo: '#475569',
    emoji: '💬',
    order: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'cat-6',
    type: 'button',
    section: 'categories',
    title: 'Custom Design',
    content: 'Create your own unique products',
    linkUrl: '/custom-design',
    categoryType: 'custom-design',
    gradientFrom: '#6366F1',
    gradientTo: '#06B6D4',
    emoji: '🎨',
    order: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Refund Policy 페이지 데이터
  {
    id: 'refund-1',
    type: 'text',
    section: 'refund',
    title: 'Refund Policy Title',
    content: 'Refund Policy',
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'refund-2',
    type: 'text',
    section: 'refund',
    title: 'Refund Policy Intro',
    content: 'SELPIC\'s refund/returns process complies with Australian Consumer Law (ACL). The following policy applies to online orders and may be updated as needed.',
    order: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'refund-3',
    type: 'text',
    section: 'refund',
    title: 'Section 1 Title',
    content: '1. Change of Mind Returns (Non-Faulty Items)',
    order: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'refund-3a',
    type: 'text',
    section: 'refund',
    title: 'Section 1 Content',
    content: 'If you wish to return an item due to a change of mind, please follow the process below.',
    order: 3.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'refund-4',
    type: 'text',
    section: 'refund',
    title: 'Section 1 List',
    content: 'Contact us first with your reason for return within 10 days from delivery (based on the tracking record). Returns sent without prior contact will not be accepted., We will provide return instructions (labels/address). We aren\'t responsible for loss/delay if items are returned without our instructions., Refunds are processed to the original payment method; your payment provider (card/PayPal/bank) may require additional processing time.',
    order: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'refund-7',
    type: 'text',
    section: 'refund',
    title: 'Section 2 Title',
    content: '2. Faulty, Damaged, or Incorrect Items (ACL Consumer Guarantee)',
    order: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'refund-7a',
    type: 'text',
    section: 'refund',
    title: 'Section 2 Content',
    content: 'If your order is faulty, damaged, or incorrect, contact us promptly with photos and your order ID. We will arrange a repair/replacement/reshipment or refund in line with the ACL.',
    order: 7.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'refund-8',
    type: 'text',
    section: 'refund',
    title: 'Section 2 List',
    content: '',
    order: 8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'refund-14',
    type: 'text',
    section: 'refund',
    title: 'Section 3 Title',
    content: '3. General Return Conditions & Process',
    order: 14,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'refund-14a',
    type: 'text',
    section: 'refund',
    title: 'Section 3 Content',
    content: 'If your order is faulty, damaged, or incorrect, contact us promptly with photos and your order ID. We will arrange a repair/replacement/reshipment or refund in line with the ACL.',
    order: 14.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'refund-15',
    type: 'text',
    section: 'refund',
    title: 'Section 3 List',
    content: '',
    order: 15,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'refund-21',
    type: 'text',
    section: 'refund',
    title: 'Contact Title',
    content: 'Contact',
    order: 21,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'refund-22',
    type: 'text',
    section: 'refund',
    title: 'Contact Email',
    content: 'support@selpic.com.au',
    order: 22,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'refund-23',
    type: 'text',
    section: 'refund',
    title: 'Contact Hours',
    content: 'Customer Service Hours: Mon–Fri 10am–5pm (Closed on weekends/public holidays)',
    order: 23,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// 기본 사이드바 메뉴 데이터
const defaultSidebarMenuItems: SidebarMenuItem[] = [
  {
    id: 'sidebar-home',
    title: 'Home',
    type: 'link',
    url: '/',
    icon: 'Home',
    order: 1,
    isActive: true,
    isComingSoon: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'sidebar-stickers',
    title: 'Stickers',
    type: 'link',
    url: '/stickers',
    icon: 'Package',
    order: 2,
    isActive: true,
    isComingSoon: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'sidebar-stamp',
    title: 'Stamps',
    type: 'link',
    url: '/stamp',
    icon: 'Package',
    order: 3,
    isActive: true,
    isComingSoon: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'sidebar-phone-cases',
    title: 'Phone Cases',
    type: 'link',
    url: '/phone-cases',
    icon: 'Smartphone',
    order: 4,
    isActive: true,
    isComingSoon: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'sidebar-hot-goods',
    title: 'Market S',
    type: 'link',
    url: '/hot-goods',
    icon: 'Flame',
    order: 5,
    isActive: true,
    isComingSoon: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'sidebar-others',
    title: 'SELPIC N',
    type: 'link',
    url: '/community',
    icon: 'MessageSquare',
    order: 6,
    isActive: true,
    isComingSoon: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'sidebar-about',
    title: 'About',
    type: 'link',
    url: '/about',
    icon: 'Info',
    order: 7,
    isActive: true,
    isComingSoon: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// 기본 Hero 슬라이더 설정
const defaultHeroSliderSettings: HeroSliderSettings = {
  autoplayDelay: 5000, // 5초
  effect: 'fade',
  loop: true,
  speed: 1000
}

// 기본 Hero 슬라이드 템플릿
const defaultHeroSlideTemplates: HeroSlideTemplate[] = [
  {
    id: 'template-product-promotion',
    name: 'Product Promotion',
    description: 'Slide template for product promotion',
    category: 'product',
    slideData: {
      type: 'image',
      src: '',
      title: 'New Product Launch',
      subtitle: 'Discover our latest collection',
      color: 'blue',
      linkUrl: '/products',
      isEventBanner: false
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  },
  {
    id: 'template-event-banner',
    name: 'Event Banner',
    description: 'Slide template for event banner',
    category: 'event',
    slideData: {
      type: 'image',
      src: '',
      title: 'Special Event',
      subtitle: 'Limited Time Offer',
      color: 'pink',
      linkUrl: '',
      isEventBanner: true,
      eventStartDate: new Date(),
      eventEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7일 후
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  },
  {
    id: 'template-seasonal-sale',
    name: 'Seasonal Sale',
    description: 'Slide template for seasonal sale',
    category: 'seasonal',
    slideData: {
      type: 'image',
      src: '',
      title: 'Seasonal Sale',
      subtitle: 'Up to 50% Off',
      color: 'purple',
      linkUrl: '/sale',
      isEventBanner: false
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  },
  {
    id: 'template-video-showcase',
    name: 'Video Showcase',
    description: 'Slide template for video showcase',
    category: 'promotion',
    slideData: {
      type: 'video',
      src: '',
      fallbackImage: '',
      title: 'Watch Our Story',
      subtitle: 'Experience the quality',
      color: 'green',
      linkUrl: '/about',
      isEventBanner: false
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  }
]

// 기본 Hero 슬라이드 데이터 - 랜딩페이지 변경사항 반영
const defaultHeroSlides: HeroSlide[] = [
  {
    id: 'hero-1',
    type: 'image',
    src: 'https://images.unsplash.com/photo-1618472043393-b31d17f5b5d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
    title: 'SELPIC',
    subtitle: 'Premium Sticker Shop',
    color: 'blue',
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'hero-2',
    type: 'image',
    src: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
    title: 'Custom Design',
    subtitle: 'Create Your Own Style',
    color: 'purple',
    order: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'hero-3',
    type: 'image',
    src: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
    title: 'Quality Products',
    subtitle: 'Made with Care & Precision',
    color: 'green',
    order: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'hero-4',
    type: 'image',
    src: 'https://images.unsplash.com/photo-1618472043393-b31d17f5b5d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
    title: 'Premium Stickers',
    subtitle: 'High Quality Materials',
    color: 'pink',
    order: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// 기본 카테고리 데이터 - 랜딩페이지의 6가지 카테고리
const defaultCategoryItems: CategoryItem[] = [
  {
    id: 'category-1',
    title: 'Stickers',
    description: 'Express yourself with our premium sticker collection',
    emoji: '🏷️',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-purple-600',
    linkUrl: '/stickers',
    tags: ['Basic', 'Premium', 'Custom'],
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'category-2',
    title: 'Stamps',
    description: 'Professional quality stamps for every occasion',
    emoji: '📮',
    gradientFrom: 'from-green-500',
    gradientTo: 'to-teal-600',
    linkUrl: '/stamp',
    tags: ['Office', 'Custom', 'Premium'],
    order: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'category-3',
    title: 'Phone Cases',
    description: 'Protect your device with style and personality',
    emoji: '📱',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-pink-600',
    linkUrl: '/phone-cases',
    tags: ['iPhone', 'Samsung', 'Custom'],
    order: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'category-4',
    title: 'Market S',
    description: 'Trending and limited edition items',
    emoji: '🔥',
    gradientFrom: 'from-red-500',
    gradientTo: 'to-orange-600',
    linkUrl: '/hot-goods',
    tags: ['Limited', 'Trending', 'Special'],
    order: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'category-5',
    title: 'SELPIC N',
    description: 'Your social space to share, inspire, and grow together',
    emoji: '💬',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-teal-600',
    linkUrl: '/community',
    tags: [],
    order: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'category-6',
    title: 'Custom Design',
    description: 'Create your own unique products',
    emoji: '🎨',
    gradientFrom: 'from-indigo-500',
    gradientTo: 'to-cyan-600',
    linkUrl: '/custom-design',
    tags: [],
    order: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// 기본 픽업 장소 데이터
const defaultPickupLocations: PickupLocation[] = [
  {
    id: 'pickup-mansfield-1',
    name: 'Mansfield Store',
    address: '7 Harvest St',
    suburb: 'Mansfield',
    state: 'QLD',
    postcode: '4122',
    country: 'Australia',
    businessHours: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '09:00', close: '13:00', closed: false },
      sunday: { closed: true }
    },
    isDefault: true,
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// 기본 배송 옵션 데이터
const defaultShippingOptions: ShippingOption[] = [
  {
    id: 'auspost-letter',
    name: 'Australia Post Large Letter (No Tracking)',
    description: 'Small/Light mail (2-8 business days, no tracking)',
    price: 2.40,
    deliveryTime: '2-8 business days',
    tracking: false,
    insurance: false,
    type: 'delivery',
    isDefault: true,
    order: 1,
    isActive: true,
    freeShippingWhenThresholdMet: true, // 기준 금액 달성 시 무료
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'auspost-regular',
    name: 'Australia Post Parcel Post',
    description: 'Standard parcel delivery with tracking',
    price: 9.70,
    deliveryTime: '5-10 business days',
    tracking: true,
    insurance: false,
    type: 'delivery',
    isDefault: false,
    order: 2,
    isActive: true,
    discountWhenThresholdMet: 2.40, // 기준 금액 달성 시 $2.40 할인
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'auspost-tracked',
    name: 'Australia Post Parcel Post (Signature)',
    description: 'Tracked delivery with signature required',
    price: 12.65,
    deliveryTime: '5-10 business days',
    tracking: true,
    insurance: false,
    type: 'delivery',
    isDefault: false,
    order: 3,
    isActive: true,
    discountWhenThresholdMet: 2.40, // 기준 금액 달성 시 $2.40 할인
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'auspost-express',
    name: 'Australia Post Express Post',
    description: 'Express delivery with tracking and insurance',
    price: 13.70,
    deliveryTime: '1-3 business days',
    tracking: true,
    insurance: true,
    type: 'delivery',
    isDefault: false,
    order: 4,
    isActive: true,
    discountWhenThresholdMet: 2.40, // 기준 금액 달성 시 $2.40 할인
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'local-pickup',
    name: 'Click & Collect (Mansfield)',
    description: 'Order online and collect from our Mansfield store. We will notify you when it is ready.',
    price: 0.0,
    deliveryTime: 'pickup during business hours',
    tracking: false,
    insurance: false,
    type: 'pickup',
    pickupLocationId: 'pickup-mansfield-1',
    isDefault: false,
    order: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'cash-on-delivery',
    name: 'Cash on Delivery',
    description: 'Pay with cash when your order is delivered',
    price: 0.0,
    deliveryTime: '5-10 business days',
    tracking: false,
    insurance: false,
    type: 'cash-on-delivery',
    isDefault: false,
    order: 6,
    isActive: true,
    alwaysFree: true, // 항상 무료
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// 기본 전역 무료 배송 설정
const defaultFreeShippingSettings: FreeShippingSettings = {
  enabled: true,
  threshold: 50,
  message: 'Free shipping on orders over $50'
}

// 기본 결제 옵션 데이터
const defaultPaymentOptions: PaymentOption[] = [
  {
    id: 'payment-card',
    name: 'Credit/Debit Card',
    type: 'card',
    description: 'Pay securely with your credit or debit card',
    fee: 0,
    feeType: 'fixed',
    requiresAuth: true,
    isDefault: true,
    order: 1,
    isActive: true,
    icon: 'CreditCard',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'payment-paypal',
    name: 'PayPal',
    type: 'paypal',
    description: 'Pay with your PayPal account',
    fee: 0,
    feeType: 'fixed',
    requiresAuth: true,
    isDefault: false,
    order: 2,
    isActive: true,
    icon: 'PayPal',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'payment-bank',
    name: 'Bank Transfer',
    type: 'bank',
    description: 'Transfer funds directly from your bank account',
    fee: 0,
    feeType: 'fixed',
    requiresAuth: false,
    isDefault: false,
    order: 3,
    isActive: true,
    icon: 'Building2',
    bankAccounts: [
      {
        id: 'bank-account-1',
        bankName: COMPANY_BANK.bankName,
        accountNumber: COMPANY_BANK.accountNumber,
        accountHolder: COMPANY_BANK.accountName,
        bsb: COMPANY_BANK.bsb,
        accountType: 'Business Account',
        order: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'payment-cash',
    name: 'Cash on Delivery',
    type: 'cash',
    description: 'Pay with cash when your order is delivered (Available for orders $50+)',
    fee: 0,
    feeType: 'fixed',
    minOrderAmount: 50,
    requiresAuth: false,
    isDefault: false,
    order: 4,
    isActive: true,
    icon: 'DollarSign',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// 기본 프로모션 코드 데이터

// 기본 VIP 등급 기준 금액 설정 (호주 달러 기준)
// benefits 텍스트는 VIP Grade Benefits의 실제 설정과 동기화됨
const defaultVIPGradeConfigs: VIPGradeConfig[] = [
  {
    id: 'grade-config-basic-0',
    code: 0,
    name: '일반',
    nameEn: 'Basic',
    minAmount: 0,
    maxAmount: 100,           // $100 미만
    color: 'gray',
    benefits: ['기본 5% 할인 쿠폰 (자동 할인 없음)'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'grade-config-silver-1',
    code: 1,
    name: '실버',
    nameEn: 'Silver',
    minAmount: 100,          // $100 이상
    maxAmount: 300,          // $300 미만
    color: 'silver',
    benefits: ['5% 상시 할인', '최대 할인 $10,000', '생일 쿠폰'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'grade-config-gold-2',
    code: 2,
    name: '골드',
    nameEn: 'Gold',
    minAmount: 300,          // $300 이상
    maxAmount: 1000,         // $1,000 미만
    color: 'gold',
    benefits: ['10% 상시 할인', '무료 배송', '최대 할인 $20,000'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'grade-config-black-3',
    code: 3,
    name: '블랙',
    nameEn: 'Black',
    minAmount: 1000,         // $1,000 이상
    maxAmount: 3000,        // $3,000 미만
    color: 'black',
    benefits: ['20% 상시 할인', '무료 배송', '최대 할인 $50,000', '전용 고객 센터'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'grade-config-vvip-4',
    code: 4,
    name: 'VVIP',
    nameEn: 'VVIP',
    minAmount: 3000,         // $3,000 이상
    maxAmount: undefined,    // 무제한
    color: 'purple',
    benefits: ['50% 상시 할인', '무료 배송', '최대 할인 $100,000', '특별 선물'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// 기본 VIP 등급 혜택 설정
const defaultVIPGradeBenefits: VIPGradeBenefit[] = [
  {
    id: 'vip-basic-0',
    gradeCode: 0,
    gradeName: 'Basic',
    baseDiscountPercentage: 0,
    freeShipping: false,
    minPurchaseAmount: 0,
    additionalBenefits: ['기본 5% 할인 쿠폰'],
    isActive: true,
    priority: 1,
    allowPromoCodeStacking: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'vip-silver-1',
    gradeCode: 1,
    gradeName: 'Silver',
    baseDiscountPercentage: 5,
    freeShipping: false,
    maxDiscountAmount: 10000,
    minPurchaseAmount: 0,
    additionalBenefits: ['5% 상시 할인', '생일 쿠폰'],
    isActive: true,
    priority: 2,
    allowPromoCodeStacking: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'vip-gold-2',
    gradeCode: 2,
    gradeName: 'Gold',
    baseDiscountPercentage: 10,
    freeShipping: true,
    maxDiscountAmount: 20000,
    minPurchaseAmount: 0,
    additionalBenefits: ['10% 상시 할인', '무료 배송 쿠폰'],
    isActive: true,
    priority: 3,
    allowPromoCodeStacking: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'vip-black-3',
    gradeCode: 3,
    gradeName: 'Black',
    baseDiscountPercentage: 20,
    freeShipping: true,
    maxDiscountAmount: 50000,
    minPurchaseAmount: 0,
    additionalBenefits: ['20% 상시 할인', '전용 고객 센터'],
    categoryDiscounts: { 'HotGoods': 5 }, // MARKET S 상품 5% 할인 (Stickers/Stamps는 baseDiscountPercentage 20% 적용)
    isActive: true,
    priority: 4,
    allowPromoCodeStacking: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'vip-vvip-4',
    gradeCode: 4,
    gradeName: 'VVIP',
    baseDiscountPercentage: 50,
    freeShipping: true,
    maxDiscountAmount: 100000,
    minPurchaseAmount: 0,
    additionalBenefits: ['50% 상시 할인', '특별 선물'],
    categoryDiscounts: { 'HotGoods': 10 }, // MARKET S 상품 10% 할인 (Stickers/Stamps는 baseDiscountPercentage 50% 적용)
    isActive: true,
    priority: 5,
    allowPromoCodeStacking: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const defaultPromoCodes: PromoCode[] = [
  {
    id: 'promo-welcome10',
    code: 'WELCOME10',
    description: 'Welcome discount - 10% off for new customers',
    discountType: 'percentage',
    discountValue: 10,
    minPurchaseAmount: 20,
    maxDiscountAmount: 50,
    allowVIPStacking: true,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-12-31'),
    usageLimit: 1000,
    usageCount: 0,
    userUsageLimit: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// 기본 카테고리별 Hero Slide 데이터 (sliding background용)
const defaultCategoryHeroSlides: CategoryHeroSlide[] = [
  {
    id: 'cat-hero-stickers-1',
    category: 'stickers',
    type: 'image',
    src: 'https://images.unsplash.com/photo-1618472043393-b31d17f5b5d7?w=1920&h=1080&fit=crop',
    speed: 5,
    direction: 'left',
    effect: 'slide',
    opacity: 0.3,
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'cat-hero-stamps-1',
    category: 'stamps',
    type: 'image',
    src: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=1920&h=1080&fit=crop',
    speed: 5,
    direction: 'right',
    effect: 'slide',
    opacity: 0.3,
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'cat-hero-phonecases-1',
    category: 'phone-cases',
    type: 'image',
    src: 'https://images.unsplash.com/photo-1601972602288-1e55b0b24d8b?w=1920&h=1080&fit=crop',
    speed: 5,
    direction: 'left',
    effect: 'slide',
    opacity: 0.3,
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'cat-hero-hotgoods-1',
    category: 'hot-goods',
    type: 'image',
    src: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1920&h=1080&fit=crop',
    speed: 5,
    direction: 'right',
    effect: 'slide',
    opacity: 0.3,
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// 기본 서브카테고리 데이터 (stickers 페이지의 서브카테고리 카드)
const defaultSubcategoryItems: SubcategoryItem[] = [
  {
    id: 'subcat-stickers-basic',
    category: 'stickers',
    title: 'Basic',
    description: 'High quality basic stickers',
    emoji: '📝',
    linkUrl: '/stickers/basic',
    pageTitle: 'Basic Stickers',
    pageSubtitle: 'High quality basic stickers. Made with premium materials for long-lasting use.',
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'subcat-stickers-premium',
    category: 'stickers',
    title: 'Premium',
    description: 'Special designs',
    emoji: '✨',
    linkUrl: '/stickers/premium',
    pageTitle: 'Premium Stickers',
    pageSubtitle: 'Special designs with premium quality materials and unique patterns.',
    order: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'subcat-stickers-custom',
    category: 'stickers',
    title: 'Bespoke Labels',
    description: 'Tailor-made sticker experience',
    emoji: '🎨',
    linkUrl: '/stickers/custom',
    pageTitle: 'Bespoke Labels',
    pageSubtitle: 'The Ultimate Tailor-Made Sticker Experience.',
    order: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'subcat-stickers-kids',
    category: 'stickers',
    title: 'Kids',
    description: 'Stickers for kids',
    emoji: '👶',
    linkUrl: '/stickers/kids',
    pageTitle: 'Kids Stickers',
    pageSubtitle: 'Fun and colorful stickers designed especially for children.',
    order: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'subcat-stickers-office',
    category: 'stickers',
    title: 'Office',
    description: 'Office stickers',
    emoji: '🏢',
    linkUrl: '/stickers/office',
    pageTitle: 'Office Stickers',
    pageSubtitle: 'Professional stickers perfect for office use and business environments.',
    order: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'subcat-stickers-set',
    category: 'stickers',
    title: 'Set',
    description: 'Various sticker sets',
    emoji: '📦',
    linkUrl: '/stickers/set',
    pageTitle: 'Set Stickers',
    pageSubtitle: 'Sticker sets with various sizes and designs. Order multiple items at once to receive discount benefits.',
    order: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

export const useContentStore = create<ContentStore>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (state: boolean) => {
        set({
          _hasHydrated: state
        })
      },
      contentItems: defaultContent,
      sidebarMenuItems: defaultSidebarMenuItems,
      heroSlides: defaultHeroSlides,
      heroSliderSettings: defaultHeroSliderSettings,
      heroSlideTemplates: defaultHeroSlideTemplates,
      categoryHeroSlides: defaultCategoryHeroSlides,
      categoryItems: defaultCategoryItems,
      subcategoryItems: defaultSubcategoryItems,
      pickupLocations: defaultPickupLocations,
      shippingOptions: defaultShippingOptions,
      freeShippingSettings: defaultFreeShippingSettings,
      paymentOptions: defaultPaymentOptions,
      promoCodes: defaultPromoCodes,
      vipGradeConfigs: defaultVIPGradeConfigs,
      vipGradeBenefits: defaultVIPGradeBenefits,

      addContent: (content: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newContent: ContentItem = {
          ...content,
          id: Date.now().toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
        set((state: ContentStore) => ({
          contentItems: [...state.contentItems, newContent]
        }))
      },

      updateContent: (id: string, updates: Partial<ContentItem>) => {
        console.log('콘텐츠 스토어 업데이트 시작:', id, updates)
        set((state: ContentStore) => {
          const updatedItems = state.contentItems.map((item: ContentItem) =>
            item.id === id
              ? { ...item, ...updates, updatedAt: new Date() }
              : item
          )
          console.log('업데이트된 아이템들:', updatedItems.length)
          const updatedItem = updatedItems.find(item => item.id === id)
          console.log('업데이트된 특정 아이템:', updatedItem)
          
          // Direct localStorage save to resolve persist issues
          try {
            localStorage.setItem('content-store', JSON.stringify({
              state: {
                contentItems: updatedItems,
                sidebarMenuItems: state.sidebarMenuItems,
                heroSlides: state.heroSlides
              },
              version: 0
            }))
            console.log('Direct localStorage save completed')
          } catch (error) {
            console.error('localStorage save failed:', error)
          }
          
          return {
            contentItems: updatedItems
          }
        })
        console.log('콘텐츠 스토어 업데이트 완료')
      },

      deleteContent: (id: string) => {
        set((state: ContentStore) => ({
          contentItems: state.contentItems.filter((item: ContentItem) => item.id !== id)
        }))
      },

      toggleContentActive: (id: string) => {
        set((state: ContentStore) => ({
          contentItems: state.contentItems.map((item: ContentItem) =>
            item.id === id
              ? { ...item, isActive: !item.isActive, updatedAt: new Date() }
              : item
          )
        }))
      },

      reorderContent: (section: string, newOrder: string[]) => {
        set((state: ContentStore) => ({
          contentItems: state.contentItems.map((item: ContentItem) => {
            if (item.section === section) {
              const newIndex = newOrder.indexOf(item.id)
              return newIndex !== -1 ? { ...item, order: newIndex + 1 } : item
            }
            return item
          })
        }))
      },

      getContentBySection: (section: string) => {
        const state = get()
        return state.contentItems
          .filter((item: ContentItem) => item.section === section)
          .sort((a: ContentItem, b: ContentItem) => a.order - b.order)
      },

      getActiveContentBySection: (section: string) => {
        const state = get()
        const filteredItems = state.contentItems
          .filter((item: ContentItem) => item.section === section && item.isActive)
          .sort((a: ContentItem, b: ContentItem) => a.order - b.order)
        console.log(`getActiveContentBySection(${section}):`, filteredItems)
        return filteredItems
      },

      // 사이드바 메뉴 관리 함수들
      addSidebarMenuItem: (item: Omit<SidebarMenuItem, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newItem: SidebarMenuItem = {
          ...item,
          id: Date.now().toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
        set((state: ContentStore) => ({
          sidebarMenuItems: [...state.sidebarMenuItems, newItem]
        }))
      },

      updateSidebarMenuItem: (id: string, updates: Partial<SidebarMenuItem>) => {
        set((state: ContentStore) => ({
          sidebarMenuItems: state.sidebarMenuItems.map((item: SidebarMenuItem) =>
            item.id === id
              ? { ...item, ...updates, updatedAt: new Date() }
              : item
          )
        }))
      },

      deleteSidebarMenuItem: (id: string) => {
        set((state: ContentStore) => ({
          sidebarMenuItems: state.sidebarMenuItems.filter((item: SidebarMenuItem) => item.id !== id)
        }))
      },

      getActiveSidebarMenuItems: () => {
        const state = get()
        return state.sidebarMenuItems
          .filter((item: SidebarMenuItem) => item.isActive)
          .sort((a: SidebarMenuItem, b: SidebarMenuItem) => a.order - b.order)
      },

      reorderSidebarMenuItem: (fromIndex: number, toIndex: number) => {
        set((state: ContentStore) => {
          const updatedItems = [...state.sidebarMenuItems]
          const [movedItem] = updatedItems.splice(fromIndex, 1)
          updatedItems.splice(toIndex, 0, movedItem)
          
          // 순서 재정렬
          const reorderedItems = updatedItems.map((item: SidebarMenuItem, index: number) => ({
            ...item,
            order: index + 1,
            updatedAt: new Date()
          }))
          
          return {
            sidebarMenuItems: reorderedItems
          }
        })
      },

      // Hero 슬라이드 관리 함수들
      addHeroSlide: (slide: Omit<HeroSlide, 'id' | 'createdAt' | 'updatedAt'>) => {
        set((state: ContentStore) => {
          // 🆕 order가 설정되지 않았거나 0이면 자동으로 최대값 + 1로 설정
          const maxOrder = state.heroSlides.length > 0 
            ? Math.max(...state.heroSlides.map(s => s.order || 0))
            : 0
          const autoOrder = slide.order && slide.order > 0 ? slide.order : maxOrder + 1
          
          // 🆕 isActive가 명시적으로 설정되지 않으면 true로 기본값 설정
          const autoIsActive = slide.isActive !== undefined ? slide.isActive : true
          
          const newSlide: HeroSlide = {
            ...slide,
            id: `hero-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // 🆕 더 고유한 ID 생성
            order: autoOrder, // 🆕 자동으로 설정된 order 사용
            isActive: autoIsActive, // 🆕 자동으로 설정된 isActive 사용
            createdAt: new Date(),
            updatedAt: new Date()
          }
          
          const updatedSlides = [...state.heroSlides, newSlide]
          
          console.log('➕ Adding new hero slide:', {
            id: newSlide.id,
            title: newSlide.title,
            type: newSlide.type,
            src: newSlide.src.substring(0, 50) + '...',
            order: newSlide.order,
            isActive: newSlide.isActive,
            maxOrder: maxOrder,
            autoOrder: autoOrder
          })
          console.log('📊 All slides after add:', updatedSlides.map(s => ({
            id: s.id,
            title: s.title,
            order: s.order,
            isActive: s.isActive
          })))
          
          // 🆕 Custom Event 발생하여 홈페이지에 알림
          if (typeof window !== 'undefined') {
            // 즉시 이벤트 발생
            window.dispatchEvent(new CustomEvent('content-store-updated', {
              detail: { type: 'heroSlides', action: 'add', slideId: newSlide.id }
            }))
            console.log('📢 Dispatched content-store-updated event for new hero slide')
            
            // 🆕 추가로 storage 이벤트도 발생시켜 다른 탭에서도 감지 가능하도록
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'content-store',
              newValue: JSON.stringify({ state: { heroSlides: updatedSlides } })
            }))
          }
          
          // Force localStorage update
          setTimeout(() => {
            try {
              const currentData = JSON.parse(localStorage.getItem('content-store') || '{}')
              const newData = {
                ...currentData,
                state: {
                  ...currentData.state,
                  heroSlides: updatedSlides
                }
              }
              localStorage.setItem('content-store', JSON.stringify(newData))
              console.log('💾 Force saved new hero slide to localStorage:', {
                slideId: newSlide.id,
                totalSlides: updatedSlides.length
              })
            } catch (error) {
              console.error('❌ Failed to force save new hero slide:', error)
            }
          }, 100)
          
          return { heroSlides: updatedSlides }
        })
      },

      updateHeroSlide: (id: string, updates: Partial<HeroSlide>) => {
        set((state: ContentStore) => {
          const updatedSlides = state.heroSlides.map((slide: HeroSlide) =>
            slide.id === id
              ? { ...slide, ...updates, updatedAt: new Date() }
              : slide
          )
          
          console.log('🔄 Updating hero slide:', id, updates)
          console.log('📊 Updated slides:', updatedSlides)
          
          // 🆕 Custom Event 발생하여 홈페이지에 알림
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('content-store-updated', {
              detail: { type: 'heroSlides', action: 'update', slideId: id }
            }))
            console.log('📢 Dispatched content-store-updated event for hero slide update')
          }
          
          // Force localStorage update
          setTimeout(() => {
            try {
              const currentData = JSON.parse(localStorage.getItem('content-store') || '{}')
              const newData = {
                ...currentData,
                state: {
                  ...currentData.state,
                  heroSlides: updatedSlides
                }
              }
              localStorage.setItem('content-store', JSON.stringify(newData))
              console.log('💾 Force saved hero slides to localStorage')
            } catch (error) {
              console.error('❌ Failed to force save hero slides:', error)
            }
          }, 100)
          
          return { heroSlides: updatedSlides }
        })
      },

      deleteHeroSlide: (id: string) => {
        set((state: ContentStore) => {
          const updatedSlides = state.heroSlides.filter((slide: HeroSlide) => slide.id !== id)
          
          console.log('🗑️ Deleting hero slide:', id)
          console.log('📊 Remaining slides:', updatedSlides)
          
          // 🆕 Custom Event 발생하여 홈페이지에 알림
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('content-store-updated', {
              detail: { type: 'heroSlides', action: 'delete', slideId: id }
            }))
            console.log('📢 Dispatched content-store-updated event for hero slide deletion')
          }
          
          // Force localStorage update
          setTimeout(() => {
            try {
              const currentData = JSON.parse(localStorage.getItem('content-store') || '{}')
              const newData = {
                ...currentData,
                state: {
                  ...currentData.state,
                  heroSlides: updatedSlides
                }
              }
              localStorage.setItem('content-store', JSON.stringify(newData))
              console.log('💾 Force saved hero slide deletion to localStorage')
            } catch (error) {
              console.error('❌ Failed to force save hero slide deletion:', error)
            }
          }, 100)
          
          return { heroSlides: updatedSlides }
        })
      },

      toggleHeroSlideActive: (id: string) => {
        set((state: ContentStore) => {
          const updatedSlides = state.heroSlides.map((slide: HeroSlide) =>
            slide.id === id
              ? { ...slide, isActive: !slide.isActive, updatedAt: new Date() }
              : slide
          )
          
          console.log('🔄 Toggling hero slide active status:', id)
          console.log('📊 Updated slides:', updatedSlides)
          
          // 🆕 Custom Event 발생하여 홈페이지에 알림
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('content-store-updated', {
              detail: { type: 'heroSlides', action: 'toggle', slideId: id }
            }))
            console.log('📢 Dispatched content-store-updated event for hero slide toggle')
          }
          
          // Force localStorage update
          setTimeout(() => {
            try {
              const currentData = JSON.parse(localStorage.getItem('content-store') || '{}')
              const newData = {
                ...currentData,
                state: {
                  ...currentData.state,
                  heroSlides: updatedSlides
                }
              }
              localStorage.setItem('content-store', JSON.stringify(newData))
              console.log('💾 Force saved hero slide toggle to localStorage')
            } catch (error) {
              console.error('❌ Failed to force save hero slide toggle:', error)
            }
          }, 100)
          
          return { heroSlides: updatedSlides }
        })
      },

      reorderHeroSlide: (fromIndex: number, toIndex: number) => {
        set((state: ContentStore) => {
          const updatedSlides = [...state.heroSlides]
          const [movedSlide] = updatedSlides.splice(fromIndex, 1)
          updatedSlides.splice(toIndex, 0, movedSlide)
          
          // 순서 재정렬
          const reorderedSlides = updatedSlides.map((slide: HeroSlide, index: number) => ({
            ...slide,
            order: index + 1,
            updatedAt: new Date()
          }))
          
          console.log('🔄 Reordering hero slides:', fromIndex, 'to', toIndex)
          console.log('📊 Reordered slides:', reorderedSlides)
          
          // 🆕 Custom Event 발생하여 홈페이지에 알림
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('content-store-updated', {
              detail: { type: 'heroSlides', action: 'reorder', fromIndex, toIndex }
            }))
            console.log('📢 Dispatched content-store-updated event for hero slide reorder')
          }
          
          // Force localStorage update
          setTimeout(() => {
            try {
              const currentData = JSON.parse(localStorage.getItem('content-store') || '{}')
              const newData = {
                ...currentData,
                state: {
                  ...currentData.state,
                  heroSlides: reorderedSlides
                }
              }
              localStorage.setItem('content-store', JSON.stringify(newData))
              console.log('💾 Force saved hero slide reorder to localStorage')
            } catch (error) {
              console.error('❌ Failed to force save hero slide reorder:', error)
            }
          }, 100)
          
          return {
            heroSlides: reorderedSlides
          }
        })
      },

      getActiveHeroSlides: () => {
        const state = get()
        // 저장된 슬라이드가 없으면 기본 히어로 슬라이드(이미지+동영상) 반환
        if (!state.heroSlides || state.heroSlides.length === 0) {
          return defaultHeroSlides
        }
        const isLikelyImageUrl = (url: string): boolean => {
          if (!url) return false
          const lower = url.toLowerCase()
          return lower.includes('images.unsplash.com') || lower.includes('images.pexels.com') ||
            lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') ||
            lower.endsWith('.gif') || lower.endsWith('.webp')
        }
        const isInvalidVideoSrc = (src: string): boolean => {
          if (!src) return true
          const lower = src.toLowerCase()
          // 🆕 indexeddb://는 항상 허용 (Media Library에서 선택한 파일)
          if (lower.startsWith('indexeddb://')) return false
          const isBlob = lower.startsWith('blob:')
          // data:video/는 Media Library에서 선택한 동영상이므로 허용
          const isDataImage = lower.startsWith('data:image/')
          const isDataVideo = lower.startsWith('data:video/')
          const looksLikeImage = isLikelyImageUrl(lower)
          // ✅ blob: URL은 indexeddb://에서 변환된 것이므로 허용 (동영상에 사용 가능)
          // ✅ data:video/도 허용
          // ❌ data:image/와 이미지 URL만 무효로 판단
          return isDataImage || looksLikeImage
        }
        const filteredSlides = state.heroSlides
          .filter((slide: HeroSlide) => {
            // 🆕 isActive가 false인 슬라이드는 필터링
            if (!slide.isActive) {
              console.log('🔍 [getActiveHeroSlides] Filtering out inactive slide:', {
                id: slide.id,
                title: slide.title,
                isActive: slide.isActive
              })
              return false
            }
            return true
          })
          .filter((slide: HeroSlide) => {
            // 🆕 src가 없는 슬라이드는 필터링
            if (!slide.src || !slide.src.trim()) {
              console.warn('🔍 [getActiveHeroSlides] Filtering out slide with empty src:', {
                id: slide.id,
                title: slide.title,
                type: slide.type
              })
              return false
            }
            
            // 🆕 동영상 슬라이드의 경우 src 유효성 검증
            if (slide.type === 'video') {
              if (isInvalidVideoSrc(slide.src)) {
                console.warn('🔍 [getActiveHeroSlides] Filtering out invalid video slide src:', {
                  id: slide.id,
                  title: slide.title,
                  src: slide.src.substring(0, 50) + '...'
                })
                return false
              }
            }
            
            // 🆕 indexeddb:// 형식은 항상 허용 (이미지/동영상 모두)
            if (slide.src.startsWith('indexeddb://')) {
              console.log('✅ [getActiveHeroSlides] Allowing indexeddb:// slide:', {
                id: slide.id,
                title: slide.title,
                type: slide.type,
                src: slide.src.substring(0, 50) + '...'
              })
              return true
            }
            
            return true
          })
          .sort((a: HeroSlide, b: HeroSlide) => a.order - b.order)
        
        console.log('📊 [getActiveHeroSlides] Filtered slides:', {
          total: state.heroSlides.length,
          active: filteredSlides.length,
          slides: filteredSlides.map(s => ({
            id: s.id,
            title: s.title,
            type: s.type,
            isActive: s.isActive,
            src: s.src.substring(0, 50) + '...'
          }))
        })
        
        return filteredSlides
      },

      updateHeroSliderSettings: (settings: Partial<HeroSliderSettings>) => {
        set((state: ContentStore) => {
          // slide 효과가 설정되어 있으면 fade로 변경
          const normalizedSettings = { ...settings }
          if (normalizedSettings.effect === 'slide') {
            normalizedSettings.effect = 'fade'
          }
          
          const updatedSettings = {
            ...state.heroSliderSettings,
            ...normalizedSettings
          }
          
          // 기존 설정에서도 slide가 있으면 fade로 변경
          if (updatedSettings.effect === 'slide') {
            updatedSettings.effect = 'fade'
          }
          
          console.log('🔄 Updating hero slider settings:', updatedSettings)
          
          // 🆕 Custom Event 발생하여 홈페이지에 알림
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('content-store-updated', {
              detail: { type: 'heroSliderSettings', action: 'update', settings: updatedSettings }
            }))
            console.log('📢 Dispatched content-store-updated event for hero slider settings update')
          }
          
          // Force localStorage update for immediate persistence
          setTimeout(() => {
            try {
              const currentData = JSON.parse(localStorage.getItem('content-store') || '{}')
              const newData = {
                ...currentData,
                state: {
                  ...currentData.state,
                  heroSliderSettings: updatedSettings
                }
              }
              localStorage.setItem('content-store', JSON.stringify(newData))
              if (process.env.NODE_ENV === 'development') {
                console.log('💾 Hero Slider Settings saved to localStorage:', updatedSettings)
              }
            } catch (error) {
              console.error('❌ Failed to save hero slider settings to localStorage:', error)
            }
          }, 0)
          
          return {
            heroSliderSettings: updatedSettings
          }
        })
      },

      // Hero 슬라이드 템플릿 관리 함수들
      addHeroSlideTemplate: (template: Omit<HeroSlideTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newTemplate: HeroSlideTemplate = {
          ...template,
          id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        set((state: ContentStore) => ({
          heroSlideTemplates: [...state.heroSlideTemplates, newTemplate]
        }))
      },

      updateHeroSlideTemplate: (id: string, updates: Partial<HeroSlideTemplate>) => {
        set((state: ContentStore) => {
          const template = state.heroSlideTemplates.find((t: HeroSlideTemplate) => t.id === id)
          if (!template) {
            console.warn('Template not found:', id)
            return state
          }
          
          // 기본 템플릿은 isDefault 속성 변경 방지
          const safeUpdates = { ...updates }
          if (template.isDefault) {
            delete safeUpdates.isDefault
          }
          
          // slideData가 있으면 병합
          let finalSlideData = template.slideData
          if (updates.slideData) {
            finalSlideData = { ...template.slideData, ...updates.slideData }
          }
          
          return {
            heroSlideTemplates: state.heroSlideTemplates.map((t: HeroSlideTemplate) =>
              t.id === id
                ? { 
                    ...t, 
                    ...safeUpdates, 
                    slideData: finalSlideData,
                    updatedAt: new Date() 
                  }
                : t
            )
          }
        })
      },

      deleteHeroSlideTemplate: (id: string) => {
        set((state: ContentStore) => {
          const template = state.heroSlideTemplates.find((t: HeroSlideTemplate) => t.id === id)
          
          // 기본 템플릿 삭제 방지
          if (template?.isDefault) {
            console.warn('Cannot delete default template:', id)
            return state
          }
          
          return {
            heroSlideTemplates: state.heroSlideTemplates.filter((t: HeroSlideTemplate) => t.id !== id)
          }
        })
      },

      getHeroSlideTemplate: (id: string) => {
        const state = get()
        return state.heroSlideTemplates.find((template: HeroSlideTemplate) => template.id === id)
      },

      getHeroSlideTemplatesByCategory: (category: HeroSlideTemplate['category']) => {
        const state = get()
        return state.heroSlideTemplates.filter((template: HeroSlideTemplate) => template.category === category)
      },

      // 카테고리 관리 함수들
      addCategoryItem: (category: Omit<CategoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newCategory: CategoryItem = {
          ...category,
          id: Date.now().toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
        set((state: ContentStore) => {
          const updatedCategories = [...state.categoryItems, newCategory]
          
          // Direct localStorage save for permanent storage - 전체 state 포함
          try {
            const currentState = get()
            const updatedData = {
              state: {
                ...currentState,
                categoryItems: updatedCategories.map(item => ({
                  ...item,
                  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
                  updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
                })),
                contentItems: currentState.contentItems.map(item => ({
                  ...item,
                  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
                  updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
                })),
                sidebarMenuItems: currentState.sidebarMenuItems.map(item => ({
                  ...item,
                  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
                  updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
                })),
                heroSlides: currentState.heroSlides.map(slide => ({
                  ...slide,
                  createdAt: slide.createdAt instanceof Date ? slide.createdAt.toISOString() : slide.createdAt,
                  updatedAt: slide.updatedAt instanceof Date ? slide.updatedAt.toISOString() : slide.updatedAt
                })),
                categoryHeroSlides: currentState.categoryHeroSlides.map(slide => ({
                  ...slide,
                  createdAt: slide.createdAt instanceof Date ? slide.createdAt.toISOString() : slide.createdAt,
                  updatedAt: slide.updatedAt instanceof Date ? slide.updatedAt.toISOString() : slide.updatedAt
                }))
              },
              version: 0
            }
            localStorage.setItem('content-store', JSON.stringify(updatedData))
            console.log('Category item added and saved to localStorage (full state):', newCategory)
          } catch (error) {
            console.error('Failed to save new category item to localStorage:', error)
          }
          
          return { categoryItems: updatedCategories }
        })
      },

      updateCategoryItem: (id: string, updates: Partial<CategoryItem>) => {
        console.log('🔄 updateCategoryItem called:', { id, updates })
        set((state: ContentStore) => {
          const updatedCategories = state.categoryItems.map((item: CategoryItem) =>
            item.id === id
              ? { ...item, ...updates, updatedAt: new Date() }
              : item
          )
          
          const updatedItem = updatedCategories.find((item: CategoryItem) => item.id === id)
          console.log('✅ Category item updated:', {
            id,
            updates,
            updatedItem: updatedItem ? {
              id: updatedItem.id,
              title: updatedItem.title,
              description: updatedItem.description,
              emoji: updatedItem.emoji,
              backgroundImage: updatedItem.backgroundImage,
              gradientFrom: updatedItem.gradientFrom,
              gradientTo: updatedItem.gradientTo,
              linkUrl: updatedItem.linkUrl
            } : null,
            totalCategories: updatedCategories.length
          })
          
          // Direct localStorage save for permanent storage - 전체 state 포함
          try {
            const currentState = get()
            const updatedData = {
              state: {
                ...currentState,
                categoryItems: updatedCategories.map(item => ({
                  ...item,
                  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
                  updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
                })),
                contentItems: currentState.contentItems.map(item => ({
                  ...item,
                  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
                  updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
                })),
                sidebarMenuItems: currentState.sidebarMenuItems.map(item => ({
                  ...item,
                  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
                  updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
                })),
                heroSlides: currentState.heroSlides.map(slide => ({
                  ...slide,
                  createdAt: slide.createdAt instanceof Date ? slide.createdAt.toISOString() : slide.createdAt,
                  updatedAt: slide.updatedAt instanceof Date ? slide.updatedAt.toISOString() : slide.updatedAt
                })),
                categoryHeroSlides: currentState.categoryHeroSlides.map(slide => ({
                  ...slide,
                  createdAt: slide.createdAt instanceof Date ? slide.createdAt.toISOString() : slide.createdAt,
                  updatedAt: slide.updatedAt instanceof Date ? slide.updatedAt.toISOString() : slide.updatedAt
                }))
              },
              version: 0
            }
            localStorage.setItem('content-store', JSON.stringify(updatedData))
            console.log('✅ Category item saved to localStorage (full state)')
            
            // 커스텀 이벤트를 트리거하여 같은 탭과 다른 탭 모두에 알림
            if (typeof window !== 'undefined') {
              // 같은 탭에서도 작동하는 커스텀 이벤트
              window.dispatchEvent(new CustomEvent('content-store-updated', {
                detail: { type: 'categoryItems', data: updatedData }
              }))
              
              // 다른 탭을 위한 storage 이벤트 (다른 탭에서만 작동)
              window.dispatchEvent(new StorageEvent('storage', {
                key: 'content-store',
                newValue: JSON.stringify(updatedData)
              }))
            }
          } catch (error) {
            console.error('❌ Failed to save category item to localStorage:', error)
          }
          
          return { categoryItems: updatedCategories }
        })
      },

      deleteCategoryItem: (id: string) => {
        set((state: ContentStore) => {
          const updatedCategories = state.categoryItems.filter((item: CategoryItem) => item.id !== id)
          
          // Direct localStorage save for permanent storage
          try {
            const currentData = JSON.parse(localStorage.getItem('content-store') || '{}')
            const updatedData = {
              ...currentData,
              state: {
                ...currentData.state,
                categoryItems: updatedCategories
              }
            }
            localStorage.setItem('content-store', JSON.stringify(updatedData))
            console.log('Category item deleted and saved to localStorage:', id)
          } catch (error) {
            console.error('Failed to save category item deletion to localStorage:', error)
          }
          
          return { categoryItems: updatedCategories }
        })
      },

      toggleCategoryItemActive: (id: string) => {
        set((state: ContentStore) => {
          const updatedCategories = state.categoryItems.map((item: CategoryItem) =>
            item.id === id
              ? { ...item, isActive: !item.isActive, updatedAt: new Date() }
              : item
          )
          
          // Direct localStorage save for permanent storage
          try {
            const currentData = JSON.parse(localStorage.getItem('content-store') || '{}')
            const updatedData = {
              ...currentData,
              state: {
                ...currentData.state,
                categoryItems: updatedCategories
              }
            }
            localStorage.setItem('content-store', JSON.stringify(updatedData))
            console.log('Category item active status toggled and saved to localStorage:', id)
          } catch (error) {
            console.error('Failed to save category item toggle to localStorage:', error)
          }
          
          return { categoryItems: updatedCategories }
        })
      },

      reorderCategoryItem: (fromIndex: number, toIndex: number) => {
        set((state: ContentStore) => {
          const reorderedCategories = [...state.categoryItems]
          const [movedCategory] = reorderedCategories.splice(fromIndex, 1)
          reorderedCategories.splice(toIndex, 0, movedCategory)
          
          // 순서 업데이트
          const updatedCategories = reorderedCategories.map((category, index) => ({
            ...category,
            order: index + 1,
            updatedAt: new Date()
          }))
          
          // Direct localStorage save for permanent storage
          try {
            const currentData = JSON.parse(localStorage.getItem('content-store') || '{}')
            const updatedData = {
              ...currentData,
              state: {
                ...currentData.state,
                categoryItems: updatedCategories
              }
            }
            localStorage.setItem('content-store', JSON.stringify(updatedData))
            console.log('Category items reordered and saved to localStorage:', fromIndex, 'to', toIndex)
          } catch (error) {
            console.error('Failed to save category items reorder to localStorage:', error)
          }
          
          return {
            categoryItems: updatedCategories
          }
        })
      },

      getActiveCategoryItems: () => {
        const state = get()
        // 저장된 카테고리가 없으면 기본 카테고리(Stickers, Stamps 등) 반환
        if (!state.categoryItems || state.categoryItems.length === 0) {
          return defaultCategoryItems
        }
        return state.categoryItems
          .filter((category: CategoryItem) => category.isActive)
          .sort((a: CategoryItem, b: CategoryItem) => a.order - b.order)
      },

      // 서브카테고리 관리 함수들
      addSubcategoryItem: (subcategory: Omit<SubcategoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newSubcategory: SubcategoryItem = {
          ...subcategory,
          id: Date.now().toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
        set((state: ContentStore) => {
          const updatedItems = [...state.subcategoryItems, newSubcategory]
          
          // Direct localStorage save for immediate persistence
          try {
            const currentState = get()
            const updatedData = {
              state: {
                ...currentState,
                subcategoryItems: updatedItems.map(item => ({
                  ...item,
                  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
                  updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
                }))
              },
              version: 0
            }
            localStorage.setItem('content-store', JSON.stringify(updatedData))
            console.log('✅ Subcategory added and saved to localStorage')
          } catch (error) {
            console.error('❌ Failed to save subcategory to localStorage:', error)
          }
          
          return {
            subcategoryItems: updatedItems
          }
        })
      },

      updateSubcategoryItem: (id: string, updates: Partial<SubcategoryItem>) => {
        console.log('🔄 updateSubcategoryItem called:', { id, updates })
        set((state: ContentStore) => {
          const updatedItems = state.subcategoryItems.map((item: SubcategoryItem) =>
            item.id === id
              ? { ...item, ...updates, updatedAt: new Date() }
              : item
          )
          
          // Direct localStorage save for immediate persistence
          try {
            const currentState = get()
            const updatedData = {
              state: {
                ...currentState,
                subcategoryItems: updatedItems.map((item: SubcategoryItem) => ({
                  ...item,
                  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
                  updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
                }))
              },
              version: 0
            }
            localStorage.setItem('content-store', JSON.stringify(updatedData))
            console.log('✅ Subcategory updated and saved to localStorage:', id)
          } catch (error) {
            console.error('❌ Failed to save subcategory update to localStorage:', error)
          }
          
          return {
            subcategoryItems: updatedItems
          }
        })
      },

      deleteSubcategoryItem: (id: string) => {
        set((state: ContentStore) => {
          const updatedItems = state.subcategoryItems.filter((item: SubcategoryItem) => item.id !== id)
          
          // Direct localStorage save for immediate persistence
          try {
            const currentState = get()
            const updatedData = {
              state: {
                ...currentState,
                subcategoryItems: updatedItems.map((item: SubcategoryItem) => ({
                  ...item,
                  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
                  updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
                }))
              },
              version: 0
            }
            localStorage.setItem('content-store', JSON.stringify(updatedData))
            console.log('✅ Subcategory deleted and saved to localStorage:', id)
          } catch (error) {
            console.error('❌ Failed to save subcategory deletion to localStorage:', error)
          }
          
          return {
            subcategoryItems: updatedItems
          }
        })
      },

      toggleSubcategoryItemActive: (id: string) => {
        set((state: ContentStore) => {
          const updatedItems = state.subcategoryItems.map((item: SubcategoryItem) =>
            item.id === id
              ? { ...item, isActive: !item.isActive, updatedAt: new Date() }
              : item
          )
          
          // Direct localStorage save for immediate persistence
          try {
            const currentState = get()
            const updatedData = {
              state: {
                ...currentState,
                subcategoryItems: updatedItems.map((item: SubcategoryItem) => ({
                  ...item,
                  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
                  updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
                }))
              },
              version: 0
            }
            localStorage.setItem('content-store', JSON.stringify(updatedData))
            console.log('✅ Subcategory active status toggled and saved to localStorage:', id)
          } catch (error) {
            console.error('❌ Failed to save subcategory toggle to localStorage:', error)
          }
          
          return {
            subcategoryItems: updatedItems
          }
        })
      },

      reorderSubcategoryItem: (fromIndex: number, toIndex: number) => {
        set((state: ContentStore) => {
          const reordered = [...state.subcategoryItems]
          const [moved] = reordered.splice(fromIndex, 1)
          reordered.splice(toIndex, 0, moved)
          const updatedItems = reordered.map((item: SubcategoryItem, index: number) => ({
            ...item,
            order: index + 1
          }))
          
          // Direct localStorage save for immediate persistence
          try {
            const currentState = get()
            const updatedData = {
              state: {
                ...currentState,
                subcategoryItems: updatedItems.map((item: SubcategoryItem) => ({
                  ...item,
                  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
                  updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
                }))
              },
              version: 0
            }
            localStorage.setItem('content-store', JSON.stringify(updatedData))
            console.log('✅ Subcategories reordered and saved to localStorage:', fromIndex, 'to', toIndex)
          } catch (error) {
            console.error('❌ Failed to save subcategory reorder to localStorage:', error)
          }
          
          return {
            subcategoryItems: updatedItems
          }
        })
      },

      getActiveSubcategoryItems: (category: 'stickers' | 'stamps' | 'phone-cases' | 'hot-goods') => {
        const state = get()
        return state.subcategoryItems
          .filter((item: SubcategoryItem) => item.category === category && item.isActive)
          .sort((a: SubcategoryItem, b: SubcategoryItem) => a.order - b.order)
      },

      // 카테고리별 Hero Slide 관리 함수들
      addCategoryHeroSlide: (slide: Omit<CategoryHeroSlide, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newSlide: CategoryHeroSlide = {
          ...slide,
          id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
          speed: slide.speed || 5,
          direction: slide.direction || 'left',
          opacity: slide.opacity || 0.3,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        set((state) => {
          const updatedSlides = [...state.categoryHeroSlides, newSlide]
          console.log('✅ CategoryHeroSlide added:', newSlide.id, newSlide.category)
          
          // Direct localStorage save for permanent storage - 전체 state 포함
          try {
            const currentState = get()
            const updatedData = {
              state: {
                ...currentState,
                categoryHeroSlides: updatedSlides.map(s => ({
                  ...s,
                  createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
                  updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt
                })),
                contentItems: currentState.contentItems.map(item => ({
                  ...item,
                  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
                  updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
                })),
                sidebarMenuItems: currentState.sidebarMenuItems.map(item => ({
                  ...item,
                  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
                  updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
                })),
                heroSlides: currentState.heroSlides.map(slide => ({
                  ...slide,
                  createdAt: slide.createdAt instanceof Date ? slide.createdAt.toISOString() : slide.createdAt,
                  updatedAt: slide.updatedAt instanceof Date ? slide.updatedAt.toISOString() : slide.updatedAt
                })),
                categoryItems: currentState.categoryItems.map(item => ({
                  ...item,
                  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
                  updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
                }))
              },
              version: 0
            }
            localStorage.setItem('content-store', JSON.stringify(updatedData))
            console.log('✅ CategoryHeroSlide saved to localStorage (full state)')
            
            // 커스텀 이벤트를 트리거하여 같은 탭과 다른 탭 모두에 알림
            if (typeof window !== 'undefined') {
              // 같은 탭에서도 작동하는 커스텀 이벤트
              window.dispatchEvent(new CustomEvent('content-store-updated', {
                detail: { type: 'categoryHeroSlides', data: updatedData }
              }))
              
              // 다른 탭을 위한 storage 이벤트 (다른 탭에서만 작동)
              window.dispatchEvent(new StorageEvent('storage', {
                key: 'content-store',
                newValue: JSON.stringify(updatedData)
              }))
            }
          } catch (error) {
            console.error('❌ Failed to save CategoryHeroSlide to localStorage:', error)
          }
          
          return { categoryHeroSlides: updatedSlides }
        })
      },

      updateCategoryHeroSlide: (id: string, updates: Partial<CategoryHeroSlide>) => {
        console.log('🔄 updateCategoryHeroSlide called:', { id, updates })
        set((state: ContentStore) => {
          const updatedSlides = state.categoryHeroSlides.map((slide: CategoryHeroSlide) =>
            slide.id === id
              ? { ...slide, ...updates, updatedAt: new Date() }
              : slide
          )
          
          const updatedSlide = updatedSlides.find((s: CategoryHeroSlide) => s.id === id)
          console.log('✅ CategoryHeroSlide updated:', {
            id,
            updates,
            updatedSlide: updatedSlide ? {
              id: updatedSlide.id,
              category: updatedSlide.category,
              title: updatedSlide.title || '(empty)',
              subtitle: updatedSlide.subtitle || '(empty)',
              src: updatedSlide.src?.substring(0, 50) + '...',
              speed: updatedSlide.speed,
              direction: updatedSlide.direction,
              opacity: updatedSlide.opacity,
              isActive: updatedSlide.isActive
            } : null,
            totalSlides: updatedSlides.length
          })
          
          // Direct localStorage save for permanent storage - 전체 state 포함
          try {
            const currentState = get()
            const updatedData = {
              state: {
                ...currentState,
                categoryHeroSlides: updatedSlides.map(s => ({
                  ...s,
                  createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
                  updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt
                })),
                contentItems: currentState.contentItems.map(item => ({
                  ...item,
                  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
                  updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
                })),
                sidebarMenuItems: currentState.sidebarMenuItems.map(item => ({
                  ...item,
                  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
                  updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
                })),
                heroSlides: currentState.heroSlides.map(slide => ({
                  ...slide,
                  createdAt: slide.createdAt instanceof Date ? slide.createdAt.toISOString() : slide.createdAt,
                  updatedAt: slide.updatedAt instanceof Date ? slide.updatedAt.toISOString() : slide.updatedAt
                })),
                categoryItems: currentState.categoryItems.map(item => ({
                  ...item,
                  createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
                  updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
                }))
              },
              version: 0
            }
            localStorage.setItem('content-store', JSON.stringify(updatedData))
            console.log('✅ CategoryHeroSlide update saved to localStorage (full state)')
            
            // 커스텀 이벤트를 트리거하여 같은 탭과 다른 탭 모두에 알림
            if (typeof window !== 'undefined') {
              // 같은 탭에서도 작동하는 커스텀 이벤트
              window.dispatchEvent(new CustomEvent('content-store-updated', {
                detail: { type: 'categoryHeroSlides', data: updatedData }
              }))
              
              // 다른 탭을 위한 storage 이벤트 (다른 탭에서만 작동)
              window.dispatchEvent(new StorageEvent('storage', {
                key: 'content-store',
                newValue: JSON.stringify(updatedData)
              }))
            }
          } catch (error) {
            console.error('❌ Failed to save CategoryHeroSlide update to localStorage:', error)
          }
          
          return { categoryHeroSlides: updatedSlides }
        })
      },

      deleteCategoryHeroSlide: (id: string) => {
        set((state: ContentStore) => {
          const updatedSlides = state.categoryHeroSlides.filter((slide: CategoryHeroSlide) => slide.id !== id)
          return { categoryHeroSlides: updatedSlides }
        })
      },

      toggleCategoryHeroSlideActive: (id: string) => {
        set((state: ContentStore) => {
          const updatedSlides = state.categoryHeroSlides.map((slide: CategoryHeroSlide) =>
            slide.id === id
              ? { ...slide, isActive: !slide.isActive, updatedAt: new Date() }
              : slide
          )
          return { categoryHeroSlides: updatedSlides }
        })
      },

      reorderCategoryHeroSlide: (category: 'stickers' | 'stamps' | 'phone-cases' | 'hot-goods', fromIndex: number, toIndex: number) => {
        set((state: ContentStore) => {
          // 카테고리별로 슬라이드 분리
          const categorySlides = state.categoryHeroSlides
            .filter((slide: CategoryHeroSlide) => slide.category === category)
            .sort((a: CategoryHeroSlide, b: CategoryHeroSlide) => a.order - b.order)
          
          const otherSlides = state.categoryHeroSlides
            .filter((slide: CategoryHeroSlide) => slide.category !== category)
          
          // 카테고리 내에서 재정렬
          const [movedSlide] = categorySlides.splice(fromIndex, 1)
          categorySlides.splice(toIndex, 0, movedSlide)
          
          // order 재설정 (카테고리별로)
          const reorderedCategorySlides = categorySlides.map((slide: CategoryHeroSlide, index: number) => ({
            ...slide,
            order: index + 1,
            updatedAt: new Date()
          }))
          
          // 다른 카테고리 슬라이드와 병합
          const allSlides = [...otherSlides, ...reorderedCategorySlides]
          
          return { categoryHeroSlides: allSlides }
        })
      },

      getActiveCategoryHeroSlides: (category: 'stickers' | 'stamps' | 'phone-cases' | 'hot-goods') => {
        const state = get()
        if (!state.categoryHeroSlides || !Array.isArray(state.categoryHeroSlides)) {
          return []
        }
        return state.categoryHeroSlides
          .filter((slide: CategoryHeroSlide) => slide && slide.category === category && slide.isActive)
          .sort((a: CategoryHeroSlide, b: CategoryHeroSlide) => a.order - b.order)
      },

      // 픽업 장소 관리 함수들
      addPickupLocation: (location: Omit<PickupLocation, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newLocation: PickupLocation = {
          ...location,
          id: `pickup-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        set((state: ContentStore) => ({
          pickupLocations: [...state.pickupLocations, newLocation]
        }))
      },

      updatePickupLocation: (id: string, updates: Partial<PickupLocation>) => {
        set((state: ContentStore) => ({
          pickupLocations: state.pickupLocations.map((loc: PickupLocation) =>
            loc.id === id
              ? { ...loc, ...updates, updatedAt: new Date() }
              : loc
          )
        }))
      },

      deletePickupLocation: (id: string) => {
        set((state: ContentStore) => ({
          pickupLocations: state.pickupLocations.filter((loc: PickupLocation) => loc.id !== id)
        }))
      },

      togglePickupLocationActive: (id: string) => {
        set((state: ContentStore) => ({
          pickupLocations: state.pickupLocations.map((loc: PickupLocation) =>
            loc.id === id ? { ...loc, isActive: !loc.isActive, updatedAt: new Date() } : loc
          )
        }))
      },

      getDefaultPickupLocation: () => {
        const state = get()
        return state.pickupLocations.find((loc: PickupLocation) => loc.isDefault && loc.isActive)
      },

      getActivePickupLocations: () => {
        const state = get()
        return state.pickupLocations
          .filter((loc: PickupLocation) => loc.isActive)
          .sort((a: PickupLocation, b: PickupLocation) => a.order - b.order)
      },

      // 배송 옵션 관리 함수들
      addShippingOption: (option: Omit<ShippingOption, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newOption: ShippingOption = {
          ...option,
          id: `shipping-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        set((state: ContentStore) => ({
          shippingOptions: [...state.shippingOptions, newOption]
        }))
      },

      updateShippingOption: (id: string, updates: Partial<ShippingOption>) => {
        set((state: ContentStore) => ({
          shippingOptions: state.shippingOptions.map((opt: ShippingOption) =>
            opt.id === id
              ? { ...opt, ...updates, updatedAt: new Date() }
              : opt
          )
        }))
      },

      deleteShippingOption: (id: string) => {
        set((state: ContentStore) => ({
          shippingOptions: state.shippingOptions.filter((opt: ShippingOption) => opt.id !== id)
        }))
      },

      toggleShippingOptionActive: (id: string) => {
        set((state: ContentStore) => ({
          shippingOptions: state.shippingOptions.map((opt: ShippingOption) =>
            opt.id === id ? { ...opt, isActive: !opt.isActive, updatedAt: new Date() } : opt
          )
        }))
      },

      getDefaultShippingOption: () => {
        const state = get()
        return state.shippingOptions.find((opt: ShippingOption) => opt.isDefault && opt.isActive)
      },

      getActiveShippingOptions: () => {
        const state = get()
        return state.shippingOptions
          .filter((opt: ShippingOption) => opt.isActive)
          .sort((a: ShippingOption, b: ShippingOption) => a.order - b.order)
      },

      getShippingOption: (id: string) => {
        const state = get()
        return state.shippingOptions.find((opt: ShippingOption) => opt.id === id)
      },

      // 전역 무료 배송 설정 관리 함수들
      updateFreeShippingSettings: (settings: Partial<FreeShippingSettings>) => {
        set((state: ContentStore) => ({
          freeShippingSettings: {
            ...state.freeShippingSettings,
            ...settings
          } as FreeShippingSettings
        }))
      },

      getFreeShippingSettings: () => {
        const state = get()
        return state.freeShippingSettings
      },

      // 결제 옵션 관리 함수들
      addPaymentOption: (option: Omit<PaymentOption, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newOption: PaymentOption = {
          ...option,
          id: `payment-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        set((state: ContentStore) => ({
          paymentOptions: [...state.paymentOptions, newOption]
        }))
      },

      updatePaymentOption: (id: string, updates: Partial<PaymentOption>) => {
        set((state: ContentStore) => ({
          paymentOptions: state.paymentOptions.map((opt: PaymentOption) =>
            opt.id === id
              ? { ...opt, ...updates, updatedAt: new Date() }
              : opt
          )
        }))
      },

      deletePaymentOption: (id: string) => {
        set((state: ContentStore) => ({
          paymentOptions: state.paymentOptions.filter((opt: PaymentOption) => opt.id !== id)
        }))
      },

      togglePaymentOptionActive: (id: string) => {
        set((state: ContentStore) => ({
          paymentOptions: state.paymentOptions.map((opt: PaymentOption) =>
            opt.id === id ? { ...opt, isActive: !opt.isActive, updatedAt: new Date() } : opt
          )
        }))
      },

      getDefaultPaymentOption: () => {
        const state = get()
        return state.paymentOptions.find((opt: PaymentOption) => opt.isDefault && opt.isActive)
      },

      getActivePaymentOptions: () => {
        const state = get()
        return state.paymentOptions
          .filter((opt: PaymentOption) => opt.isActive)
          .sort((a: PaymentOption, b: PaymentOption) => a.order - b.order)
      },

      getPaymentOption: (id: string) => {
        const state = get()
        return state.paymentOptions.find((opt: PaymentOption) => opt.id === id)
      },

      getPaymentOptionByType: (type: 'card' | 'paypal' | 'bank' | 'cash') => {
        const state = get()
        return state.paymentOptions.find((opt: PaymentOption) => opt.type === type && opt.isActive)
      },

      // 프로모션 코드 관리 함수들
      addPromoCode: (code: Omit<PromoCode, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
        // 코드 정규화: 공백 제거 및 대문자 변환
        const normalizedCode = code.code ? code.code.trim().toUpperCase() : code.code
        const newCode: PromoCode = {
          ...code,
          code: normalizedCode,
          id: `promo-${Date.now()}`,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        console.log('➕ Adding Promo Code:', {
          code: normalizedCode,
          id: newCode.id,
          description: newCode.description,
          discountType: newCode.discountType,
          discountValue: newCode.discountValue
        })
        set((state: ContentStore) => {
          const updated = [...state.promoCodes, newCode]
          console.log('✅ Promo Code added. Total count:', updated.length)
          return {
            promoCodes: updated
          }
        })
        
        // 이벤트 발생: Promo Codes 변경 알림
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('content-store-updated', {
            detail: { type: 'promoCodes' }
          }))
        }
      },

      updatePromoCode: (id: string, updates: Partial<PromoCode>) => {
        // 코드가 업데이트되는 경우 정규화
        const normalizedUpdates = updates.code 
          ? { ...updates, code: updates.code.trim().toUpperCase() }
          : updates
        console.log('✏️ Updating Promo Code:', {
          id,
          updates: normalizedUpdates
        })
        set((state: ContentStore) => {
          const updated = state.promoCodes.map((code: PromoCode) =>
            code.id === id
              ? { ...code, ...normalizedUpdates, updatedAt: new Date() }
              : code
          )
          console.log('✅ Promo Code updated. Total count:', updated.length)
          return {
            promoCodes: updated
          }
        })
        
        // 이벤트 발생: Promo Codes 변경 알림
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('content-store-updated', {
            detail: { type: 'promoCodes' }
          }))
        }
      },

      deletePromoCode: (id: string) => {
        set((state: ContentStore) => ({
          promoCodes: state.promoCodes.filter((code: PromoCode) => code.id !== id)
        }))
        
        // 이벤트 발생: Promo Codes 변경 알림
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('content-store-updated', {
            detail: { type: 'promoCodes' }
          }))
        }
      },

      togglePromoCodeActive: (id: string) => {
        set((state: ContentStore) => ({
          promoCodes: state.promoCodes.map((code: PromoCode) =>
            code.id === id ? { ...code, isActive: !code.isActive, updatedAt: new Date() } : code
          )
        }))
        
        // 이벤트 발생: Promo Codes 변경 알림
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('content-store-updated', {
            detail: { type: 'promoCodes' }
          }))
        }
      },

      getActivePromoCodes: () => {
        const state = get()
        const now = new Date()
        return state.promoCodes
          .filter((code: PromoCode) => {
            if (!code.isActive) return false
            if (code.startDate && new Date(code.startDate) > now) return false
            if (code.endDate && new Date(code.endDate) < now) return false
            if (code.usageLimit && code.usageCount >= code.usageLimit) return false
            return true
          })
          .sort((a: PromoCode, b: PromoCode) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      },

      getPromoCode: (id: string) => {
        const state = get()
        return state.promoCodes.find((code: PromoCode) => code.id === id)
      },

      getPromoCodeByCode: (codeString: string) => {
        const state = get()
        return state.promoCodes.find((code: PromoCode) => code.code.toUpperCase() === codeString.toUpperCase())
      },

      validatePromoCode: (codeString: string, subtotal: number, cartItems?: Array<{ productId: string; category?: string }>, userId?: string, orders?: Array<{ promoCode?: string; customer: { email?: string; phone?: string; id?: string }; userId?: string; status?: string }>, userEmail?: string, userPhone?: string) => {
        const state = get()
        const promoCode = state.promoCodes.find((code: PromoCode) => code.code.toUpperCase() === codeString.toUpperCase())
        
        if (!promoCode) {
          return { valid: false, error: 'Promo code not found' }
        }

        if (!promoCode.isActive) {
          return { valid: false, error: 'Promo code is not active' }
        }

        const now = new Date()
        if (promoCode.startDate && new Date(promoCode.startDate) > now) {
          return { valid: false, error: 'Promo code has not started yet' }
        }

        if (promoCode.endDate && new Date(promoCode.endDate) < now) {
          return { valid: false, error: 'Promo code has expired' }
        }

        if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) {
          return { valid: false, error: 'Promo code usage limit reached' }
        }

        // Check Per User Usage Limit
        if (promoCode.userUsageLimit && orders && orders.length > 0) {
          // 현재 사용자 정보: 파라미터로 전달된 userEmail/userPhone 우선 사용, 없으면 orders에서 찾기
          let currentUserEmail: string | undefined = userEmail
          let currentUserPhone: string | undefined = userPhone
          
          // userEmail/userPhone이 없으면 orders에서 찾기
          if (!currentUserEmail && !currentUserPhone) {
            if (userId) {
              // userId로 매칭할 수 있는 주문 찾기
              const userOrders = orders.filter((order: { promoCode?: string; customer: { email?: string; phone?: string; id?: string }; userId?: string; status?: string }) => {
                return order.userId === userId || order.customer?.id === userId
              })
              if (userOrders.length > 0) {
                currentUserEmail = userOrders[0]?.customer?.email
                currentUserPhone = userOrders[0]?.customer?.phone
              }
            }
            
            // 여전히 없으면 orders에서 첫 번째 주문의 customer 정보 사용 (비로그인 사용자)
            if (!currentUserEmail && !currentUserPhone && orders.length > 0) {
              const firstOrder = orders[0] as { promoCode?: string; customer: { email?: string; phone?: string; id?: string }; userId?: string; status?: string }
              currentUserEmail = firstOrder?.customer?.email
              currentUserPhone = firstOrder?.customer?.phone
            }
          }
          
          // 해당 사용자가 이미 사용한 횟수 계산
          const userUsageCount = orders.filter((order: { promoCode?: string; customer: { email?: string; phone?: string; id?: string }; userId?: string; status?: string }) => {
            // 주문에 프로모 코드가 있고, 취소되지 않은 주문만 카운트
            if (!order.promoCode || order.status === 'cancelled') return false
            
            // 프로모 코드가 일치하는지 확인
            if (order.promoCode.toUpperCase() !== codeString.toUpperCase()) return false
            
            // 사용자 매칭: userId, 이메일 또는 전화번호로 확인
            if (userId && (order.userId === userId || order.customer?.id === userId)) return true
            if (currentUserEmail && order.customer?.email?.toLowerCase() === currentUserEmail.toLowerCase()) return true
            if (currentUserPhone && order.customer?.phone) {
              const orderPhone = order.customer.phone.replace(/\D/g, '').replace(/^\+?61/, '0')
              const userPhoneDigits = currentUserPhone.replace(/\D/g, '').replace(/^\+?61/, '0')
              if (orderPhone === userPhoneDigits) return true
            }
            
            return false
          }).length
          
          if (userUsageCount >= promoCode.userUsageLimit) {
            return { valid: false, error: `You have already used this promo code ${promoCode.userUsageLimit} time(s). Maximum usage limit reached.` }
          }
        }

        if (promoCode.minPurchaseAmount && subtotal < promoCode.minPurchaseAmount) {
          return { valid: false, error: `Minimum purchase amount of $${promoCode.minPurchaseAmount} required` }
        }

        // Check applicable categories
        if (promoCode.applicableCategories && promoCode.applicableCategories.length > 0 && cartItems) {
          const cartCategories = cartItems.map((item: { productId: string; category?: string }) => item.category).filter(Boolean)
          const hasApplicableCategory = cartCategories.some((cat: string | undefined) => 
            promoCode.applicableCategories?.includes(cat || '')
          )
          if (!hasApplicableCategory) {
            return { valid: false, error: 'Promo code does not apply to items in your cart' }
          }
        }

        // Check applicable products
        if (promoCode.applicableProducts && promoCode.applicableProducts.length > 0 && cartItems) {
          const cartProductIds = cartItems.map((item: { productId: string; category?: string }) => item.productId)
          const hasApplicableProduct = cartProductIds.some((id: string) => 
            promoCode.applicableProducts?.includes(id)
          )
          if (!hasApplicableProduct) {
            return { valid: false, error: 'Promo code does not apply to items in your cart' }
          }
        }

        return { valid: true, promoCode }
      },

      applyPromoCode: (codeString: string, subtotal: number, cartItems?: Array<{ productId: string; category?: string }>) => {
        const state = get()
        // 먼저 validatePromoCode로 검증
        const validation = state.validatePromoCode(codeString, subtotal, cartItems)
        
        if (!validation.valid || !validation.promoCode) {
          return null
        }

        const promoCode = validation.promoCode

        let discount = 0

        if (promoCode.discountType === 'percentage') {
          discount = (subtotal * promoCode.discountValue) / 100
          if (promoCode.maxDiscountAmount) {
            discount = Math.min(discount, promoCode.maxDiscountAmount)
          }
        } else {
          discount = promoCode.discountValue
        }

        // 할인 금액이 subtotal을 초과하지 않도록
        discount = Math.min(discount, subtotal)

        return { discount: Number(discount.toFixed(2)), promoCode }
      },

      incrementPromoCodeUsage: (id: string) => {
        set((state: ContentStore) => ({
          promoCodes: state.promoCodes.map((code: PromoCode) =>
            code.id === id
              ? { ...code, usageCount: code.usageCount + 1, updatedAt: new Date() }
              : code
          )
        }))
      },

      activateScheduledPromoCodes: () => {
        const now = new Date()
        set((state: ContentStore) => {
          let hasChanges = false
          const updatedPromoCodes = state.promoCodes.map((code: PromoCode) => {
            // 예약 발행이 활성화되어 있고, 예약 시간이 지났으며, 현재 비활성화 상태인 경우
            if (
              code.isScheduled &&
              code.scheduledActivationDate &&
              new Date(code.scheduledActivationDate) <= now &&
              !code.isActive
            ) {
              hasChanges = true
              return {
                ...code,
                isActive: true,
                isScheduled: false, // 활성화 후 예약 상태 해제
                scheduledActivationDate: undefined,
                updatedAt: new Date()
              }
            }
            return code
          })

          if (hasChanges) {
            // 이벤트 발생: Promo Codes 변경 알림
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('content-store-updated', {
                detail: { type: 'promoCodes' }
              }))
            }
            return { promoCodes: updatedPromoCodes }
          }
          return state
        })
      },

      // VIP 등급 혜택 관리 함수들
      addVIPGradeBenefit: (benefit: Omit<VIPGradeBenefit, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newBenefit: VIPGradeBenefit = {
          ...benefit,
          id: `vip-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        set((state: ContentStore) => ({
          vipGradeBenefits: [...state.vipGradeBenefits, newBenefit]
        }))
        
        // 이벤트 발생: VIP Grade Benefits 변경 알림
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('content-store-updated', {
            detail: { type: 'vipGradeBenefits' }
          }))
        }
      },

      updateVIPGradeBenefit: (id: string, updates: Partial<VIPGradeBenefit>) => {
        set((state: ContentStore) => ({
          vipGradeBenefits: state.vipGradeBenefits.map((benefit: VIPGradeBenefit) =>
            benefit.id === id
              ? { ...benefit, ...updates, updatedAt: new Date() }
              : benefit
          )
        }))
        
        // 이벤트 발생: VIP Grade Benefits 변경 알림
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('content-store-updated', {
            detail: { type: 'vipGradeBenefits' }
          }))
        }
      },

      deleteVIPGradeBenefit: (id: string) => {
        set((state: ContentStore) => ({
          vipGradeBenefits: state.vipGradeBenefits.filter((benefit: VIPGradeBenefit) => benefit.id !== id)
        }))
        
        // 이벤트 발생: VIP Grade Benefits 변경 알림
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('content-store-updated', {
            detail: { type: 'vipGradeBenefits' }
          }))
        }
      },

      toggleVIPGradeBenefitActive: (id: string) => {
        set((state: ContentStore) => ({
          vipGradeBenefits: state.vipGradeBenefits.map((benefit: VIPGradeBenefit) =>
            benefit.id === id ? { ...benefit, isActive: !benefit.isActive, updatedAt: new Date() } : benefit
          )
        }))
        
        // 이벤트 발생: VIP Grade Benefits 변경 알림
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('content-store-updated', {
            detail: { type: 'vipGradeBenefits' }
          }))
        }
      },

      // VIP 등급 기준 금액 관리 함수들
      addVIPGradeConfig: (config: Omit<VIPGradeConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newConfig: VIPGradeConfig = {
          ...config,
          id: `grade-config-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        set((state: ContentStore) => ({
          vipGradeConfigs: [...state.vipGradeConfigs, newConfig]
        }))
        
        // 이벤트 발생: VIP Grade Criteria 변경 알림
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('content-store-updated', {
            detail: { type: 'vipGradeConfigs' }
          }))
        }
      },

      updateVIPGradeConfig: (id: string, updates: Partial<VIPGradeConfig>) => {
        set((state: ContentStore) => ({
          vipGradeConfigs: state.vipGradeConfigs.map((config: VIPGradeConfig) =>
            config.id === id
              ? { ...config, ...updates, updatedAt: new Date() }
              : config
          )
        }))
        
        // 이벤트 발생: VIP Grade Criteria 변경 알림
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('content-store-updated', {
            detail: { type: 'vipGradeConfigs' }
          }))
        }
      },

      deleteVIPGradeConfig: (id: string) => {
        set((state: ContentStore) => ({
          vipGradeConfigs: state.vipGradeConfigs.filter((config: VIPGradeConfig) => config.id !== id)
        }))
        
        // 이벤트 발생: VIP Grade Criteria 변경 알림
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('content-store-updated', {
            detail: { type: 'vipGradeConfigs' }
          }))
        }
      },

      toggleVIPGradeConfigActive: (id: string) => {
        set((state: ContentStore) => ({
          vipGradeConfigs: state.vipGradeConfigs.map((config: VIPGradeConfig) =>
            config.id === id ? { ...config, isActive: !config.isActive, updatedAt: new Date() } : config
          )
        }))
        
        // 이벤트 발생: VIP Grade Criteria 변경 알림
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('content-store-updated', {
            detail: { type: 'vipGradeConfigs' }
          }))
        }
      },

      getVIPGradeConfig: (gradeCode: number) => {
        const state = get()
        return state.vipGradeConfigs.find((config: VIPGradeConfig) => config.gradeCode === gradeCode && config.isActive)
      },

      getActiveVIPGradeConfigs: () => {
        const state = get()
        if (!state.vipGradeConfigs || !Array.isArray(state.vipGradeConfigs) || state.vipGradeConfigs.length === 0) {
          console.log('⚠️ getActiveVIPGradeConfigs: vipGradeConfigs가 없거나 빈 배열, 기본값 반환')
          return defaultVIPGradeConfigs.filter((config: VIPGradeConfig) => config.isActive).sort((a: VIPGradeConfig, b: VIPGradeConfig) => a.code - b.code)
        }
        const activeConfigs = state.vipGradeConfigs
          .filter((config: VIPGradeConfig) => config.isActive)
          .sort((a: VIPGradeConfig, b: VIPGradeConfig) => a.code - b.code)
        if (activeConfigs.length === 0) {
          console.warn('⚠️ getActiveVIPGradeConfigs: 활성화된 등급이 없음, 기본값 반환')
          return defaultVIPGradeConfigs.filter((config: VIPGradeConfig) => config.isActive).sort((a: VIPGradeConfig, b: VIPGradeConfig) => a.code - b.code)
        }
        return activeConfigs
      },

      getVIPGradeBenefit: (gradeCode: number) => {
        const state = get()
        return state.vipGradeBenefits.find((benefit: VIPGradeBenefit) => benefit.gradeCode === gradeCode)
      },

      getActiveVIPGradeBenefit: (gradeCode: number) => {
        const state = get()
        return state.vipGradeBenefits.find((benefit: VIPGradeBenefit) => 
          benefit.gradeCode === gradeCode && benefit.isActive
        )
      },

      getVIPGradeBenefitForCheckout: (gradeCode: number, subtotal: number, cartItems?: Array<{ productId: string; category?: string; price: number }>, currentDate = new Date()) => {
        const state = get()
        const benefit = state.vipGradeBenefits.find((b: VIPGradeBenefit) => 
          b.gradeCode === gradeCode && b.isActive
        )
        
        if (!benefit) {
          console.warn(`⚠️ getVIPGradeBenefitForCheckout - 혜택을 찾을 수 없음:`, {
            gradeCode,
            totalBenefits: state.vipGradeBenefits.length,
            activeBenefits: state.vipGradeBenefits.filter(b => b.isActive).length,
            benefitsForGrade: state.vipGradeBenefits.filter(b => b.gradeCode === gradeCode).length,
            activeBenefitsForGrade: state.vipGradeBenefits.filter(b => b.gradeCode === gradeCode && b.isActive).length
          })
          return null
        }

        // 최소 구매 금액 확인 (minPurchaseAmount가 0보다 클 때만 체크)
        if (benefit.minPurchaseAmount && benefit.minPurchaseAmount > 0 && subtotal < benefit.minPurchaseAmount) {
          console.warn(`⚠️ getVIPGradeBenefitForCheckout - 최소 구매 금액 미달:`, {
            gradeCode,
            gradeName: benefit.gradeName,
            subtotal: `$${subtotal.toFixed(2)}`,
            minPurchaseAmount: `$${benefit.minPurchaseAmount.toFixed(2)}`,
            required: `$${(benefit.minPurchaseAmount - subtotal).toFixed(2)} 더 필요`
          })
          return null
        }

        // 이벤트 기간 확인
        const isEventActive = benefit.eventStartDate && benefit.eventEndDate &&
          currentDate >= new Date(benefit.eventStartDate) &&
          currentDate <= new Date(benefit.eventEndDate)

        let discount = 0
        let freeShipping = benefit.freeShipping
        let maxDiscount = benefit.maxDiscountAmount

        // 카테고리별 할인 계산
        const normalizeCategory = (raw?: string) => {
          const lower = (raw || '').toLowerCase()
          // Market S
          if (lower.includes('market s') || lower.includes('market-s') || lower === 'markets') return 'HotGoods'
          // Phone case류도 Market S와 동일 취급
          if (lower.includes('phone case') || lower.includes('phone-case') || lower.includes('phonecase') || lower.includes('phone cases')) return 'HotGoods'
          if (lower.includes('sticker')) return 'Stickers'
          if (lower.includes('stamp')) return 'Stamps'
          if (lower.includes('hotgoods') || lower.includes('hot goods') || lower.includes('hot-goods') || lower === 'hot') return 'HotGoods'
          return raw || 'Other'
        }

        const normalizeCategoryDiscounts = (categoryDiscounts?: Record<string, number>) => {
          if (!categoryDiscounts) return {}
          const normalized: Record<string, number> = {}
          Object.entries(categoryDiscounts).forEach(([key, value]) => {
            const normKey = normalizeCategory(key)
            if (normKey) normalized[normKey] = value
          })
          return normalized
        }

        const normalizedCategoryDiscounts = normalizeCategoryDiscounts(benefit.categoryDiscounts)
        // 안전망: 관리자가 HotGoods(=Market S/phonecase) 할인율을 지운 경우 기본값으로 복원
        if (benefit.gradeCode === 3 && normalizedCategoryDiscounts['HotGoods'] === undefined) {
          normalizedCategoryDiscounts['HotGoods'] = 5 // Black 기본 HotGoods 할인
        }
        if (benefit.gradeCode === 4 && normalizedCategoryDiscounts['HotGoods'] === undefined) {
          normalizedCategoryDiscounts['HotGoods'] = 10 // VVIP 기본 HotGoods 할인
        }

        if (cartItems && cartItems.length > 0) {
          // 카테고리별로 subtotal 계산
          const categorySubtotals: Record<string, number> = {}
          cartItems.forEach((item: { productId: string; category?: string; price: number }) => {
            const category = normalizeCategory(item.category)
            categorySubtotals[category] = (categorySubtotals[category] || 0) + item.price
          })

          // 각 카테고리별로 할인 계산
          Object.keys(categorySubtotals).forEach((category: string) => {
            const categorySubtotal = categorySubtotals[category]
            let categoryDiscountPercentage = 0

            // Stickers와 Stamps는 baseDiscountPercentage 적용
            if (category === 'Stickers' || category === 'Stamps') {
              categoryDiscountPercentage = benefit.baseDiscountPercentage
            }
            // HotGoods는 categoryDiscounts에 정의된 할인율 사용 (없으면 0%)
            else if (category === 'HotGoods') {
              const hotGoodsDiscount = normalizedCategoryDiscounts['HotGoods']
              if (typeof hotGoodsDiscount === 'number') {
                categoryDiscountPercentage = hotGoodsDiscount
              } else {
                categoryDiscountPercentage = 0 // HotGoods에 할인율이 정의되지 않으면 0%
              }
            }
            // 기타 카테고리는 baseDiscountPercentage 적용
            else {
              categoryDiscountPercentage = benefit.baseDiscountPercentage
            }

            // 이벤트 할인 추가 (Stickers/Stamps에만 적용, HotGoods는 이벤트 할인 없음)
            if (isEventActive && benefit.eventDiscountPercentage !== undefined) {
              if (category === 'Stickers' || category === 'Stamps') {
                categoryDiscountPercentage += benefit.eventDiscountPercentage
              }
            }

            const categoryDiscount = (categorySubtotal * categoryDiscountPercentage) / 100
            discount += categoryDiscount
          })
        } else {
          // 카트 아이템 정보가 없으면 기존 방식대로 계산
          if (isEventActive && benefit.eventDiscountPercentage !== undefined) {
            // 이벤트 기간: 기본 할인 + 이벤트 할인
            const totalDiscountPercentage = benefit.baseDiscountPercentage + benefit.eventDiscountPercentage
            discount = (subtotal * totalDiscountPercentage) / 100
            if (benefit.eventMaxDiscountAmount) {
              maxDiscount = benefit.eventMaxDiscountAmount
            }
            if (benefit.eventFreeShipping !== undefined) {
              freeShipping = benefit.eventFreeShipping
            }
          } else {
            // 평상시: 기본 할인만
            discount = (subtotal * benefit.baseDiscountPercentage) / 100
          }
        }

        // 최대 할인 금액 적용
        if (maxDiscount) {
          discount = Math.min(discount, maxDiscount)
        }

        // 할인 금액이 subtotal을 초과하지 않도록
        discount = Math.min(discount, subtotal)
        discount = Number(discount.toFixed(2))

        return {
          discount,
          freeShipping,
          benefit
        }
      },

      resetToDefault: () => {
        const newState = { 
          contentItems: defaultContent,
          sidebarMenuItems: defaultSidebarMenuItems,
          heroSlides: defaultHeroSlides,
          heroSliderSettings: defaultHeroSliderSettings,
          heroSlideTemplates: defaultHeroSlideTemplates,
          categoryHeroSlides: defaultCategoryHeroSlides,
          categoryItems: defaultCategoryItems,
          subcategoryItems: defaultSubcategoryItems,
          pickupLocations: defaultPickupLocations,
          shippingOptions: defaultShippingOptions,
          freeShippingSettings: defaultFreeShippingSettings,
          paymentOptions: defaultPaymentOptions,
          promoCodes: defaultPromoCodes,
          vipGradeConfigs: defaultVIPGradeConfigs,
          vipGradeBenefits: defaultVIPGradeBenefits,
          _hasHydrated: true
        }
        
        // Direct localStorage save for forced update
        try {
          localStorage.setItem('content-store', JSON.stringify({
            state: newState,
            version: 0
          }))
          console.log('✅ Content store reset and saved to localStorage')
        } catch (error) {
          console.error('❌ Failed to save reset data to localStorage:', error)
        }
        
        set(newState)
      },

      updateDefaultSidebarMenu: () => {
        const state = get()
        const currentSidebarMenu = state.sidebarMenuItems
        
        // 현재 사이드바 메뉴 데이터를 기본값으로 업데이트
        const updatedDefaultSidebarMenu = currentSidebarMenu.map((item: SidebarMenuItem) => ({
          ...item,
          // About 아이콘이 없으면 'Info' 사용
          icon: item.icon || (item.id === 'sidebar-about' ? 'Info' : 'Home')
        }))
        
        // 기본값 배열을 완전히 교체
        defaultSidebarMenuItems.length = 0
        defaultSidebarMenuItems.push(...updatedDefaultSidebarMenu)
        
        // localStorage에도 저장하여 영구적으로 반영
        try {
          const newState = {
            ...state,
            sidebarMenuItems: updatedDefaultSidebarMenu
          }
          localStorage.setItem('content-store', JSON.stringify({
            state: newState,
            version: 0
          }))
          console.log('✅ Default sidebar menu updated and saved to localStorage')
        } catch (error) {
          console.error('❌ Failed to save updated sidebar menu to localStorage:', error)
        }
        
        // 상태 업데이트
        set({ sidebarMenuItems: updatedDefaultSidebarMenu })
        
        console.log('✅ Default sidebar menu updated with current management data')
        console.log('Updated default sidebar menu:', updatedDefaultSidebarMenu)
      }
    }),
    {
      name: 'content-store',
      partialize: (state) => ({ 
        contentItems: state.contentItems.map(item => ({
          ...item,
          createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
          updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
        })),
        sidebarMenuItems: state.sidebarMenuItems.map(item => ({
          ...item,
          createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
          updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
        })),
        heroSlides: state.heroSlides.map(slide => ({
          ...slide,
          createdAt: slide.createdAt instanceof Date ? slide.createdAt.toISOString() : slide.createdAt,
          updatedAt: slide.updatedAt instanceof Date ? slide.updatedAt.toISOString() : slide.updatedAt
        })),
        categoryHeroSlides: (state.categoryHeroSlides || []).map(slide => ({
          ...slide,
          createdAt: slide.createdAt instanceof Date ? slide.createdAt.toISOString() : slide.createdAt,
          updatedAt: slide.updatedAt instanceof Date ? slide.updatedAt.toISOString() : slide.updatedAt
        })),
        categoryItems: state.categoryItems.map(item => ({
          ...item,
          createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
          updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
        })),
        subcategoryItems: (state.subcategoryItems || []).map((item: any) => ({
          ...item,
          createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
          updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
        })),
        promoCodes: (state.promoCodes || []).map((code: any) => ({
          ...code,
          startDate: code.startDate instanceof Date ? code.startDate.toISOString() : code.startDate,
          endDate: code.endDate instanceof Date ? code.endDate.toISOString() : code.endDate,
          createdAt: code.createdAt instanceof Date ? code.createdAt.toISOString() : code.createdAt,
          updatedAt: code.updatedAt instanceof Date ? code.updatedAt.toISOString() : code.updatedAt
        })),
        paymentOptions: (state.paymentOptions || []).map((option: any) => ({
          ...option,
          createdAt: option.createdAt instanceof Date ? option.createdAt.toISOString() : option.createdAt,
          updatedAt: option.updatedAt instanceof Date ? option.updatedAt.toISOString() : option.updatedAt,
          bankAccounts: option.bankAccounts ? option.bankAccounts.map((acc: any) => ({
            ...acc,
            createdAt: acc.createdAt instanceof Date ? acc.createdAt.toISOString() : acc.createdAt,
            updatedAt: acc.updatedAt instanceof Date ? acc.updatedAt.toISOString() : acc.updatedAt
          })) : undefined
        })),
        shippingOptions: (state.shippingOptions || []).map((option: any) => ({
          ...option,
          createdAt: option.createdAt instanceof Date ? option.createdAt.toISOString() : option.createdAt,
          updatedAt: option.updatedAt instanceof Date ? option.updatedAt.toISOString() : option.updatedAt
        })),
        pickupLocations: (state.pickupLocations || []).map((location: any) => ({
          ...location,
          createdAt: location.createdAt instanceof Date ? location.createdAt.toISOString() : location.createdAt,
          updatedAt: location.updatedAt instanceof Date ? location.updatedAt.toISOString() : location.updatedAt
        })),
        vipGradeBenefits: (state.vipGradeBenefits || []).map((benefit: any) => ({
          ...benefit,
          createdAt: benefit.createdAt instanceof Date ? benefit.createdAt.toISOString() : benefit.createdAt,
          updatedAt: benefit.updatedAt instanceof Date ? benefit.updatedAt.toISOString() : benefit.updatedAt,
          eventStartDate: benefit.eventStartDate instanceof Date ? benefit.eventStartDate.toISOString() : benefit.eventStartDate,
          eventEndDate: benefit.eventEndDate instanceof Date ? benefit.eventEndDate.toISOString() : benefit.eventEndDate
        })),
        vipGradeConfigs: (state.vipGradeConfigs || []).map((config: any) => ({
          ...config,
          createdAt: config.createdAt instanceof Date ? config.createdAt.toISOString() : config.createdAt,
          updatedAt: config.updatedAt instanceof Date ? config.updatedAt.toISOString() : config.updatedAt
        })),
        heroSliderSettings: state.heroSliderSettings, // Hero Slider Settings 저장
        heroSlideTemplates: (state.heroSlideTemplates || []).map((template: any) => ({
          ...template,
          createdAt: template.createdAt instanceof Date ? template.createdAt.toISOString() : template.createdAt,
          updatedAt: template.updatedAt instanceof Date ? template.updatedAt.toISOString() : template.updatedAt
        })),
        freeShippingSettings: state.freeShippingSettings // 전역 무료 배송 설정 저장
      }),
      merge: (persistedState: any, currentState: any) => {
        // slide 효과가 있으면 fade로 변환
        if (persistedState?.heroSliderSettings?.effect === 'slide') {
          persistedState.heroSliderSettings.effect = 'fade'
        }
        
        // localStorage에 저장된 데이터를 우선적으로 사용 (관리자가 변경한 내용 보존)
        
        // 디버깅: Promo Codes 병합 확인
        const hasPersistedPromoCodes = persistedState?.promoCodes && Array.isArray(persistedState.promoCodes)
        console.log('🔄 Merging Promo Codes:', {
          hasPersisted: hasPersistedPromoCodes,
          persistedCount: persistedState?.promoCodes?.length || 0,
          persistedCodes: persistedState?.promoCodes?.map((c: any) => c.code) || [],
          defaultCount: currentState.promoCodes?.length || 0,
          defaultCodes: currentState.promoCodes?.map((c: any) => c.code) || []
        })
        
        const merged: any = {
          ...currentState,
          // localStorage에 저장된 데이터가 있으면 우선 사용
          contentItems: persistedState?.contentItems || currentState.contentItems,
          sidebarMenuItems: persistedState?.sidebarMenuItems || currentState.sidebarMenuItems,
          heroSlides: persistedState?.heroSlides || currentState.heroSlides,
          // heroSliderSettings: localStorage에 저장된 데이터가 있으면 사용, 없으면 기본값
          heroSliderSettings: (() => {
            const settings = persistedState?.heroSliderSettings || currentState.heroSliderSettings
            // slide 효과가 있으면 fade로 변환
            if (settings?.effect === 'slide') {
              return { ...settings, effect: 'fade' }
            }
            return settings
          })(),
          // heroSlideTemplates: localStorage에 저장된 데이터가 있으면 사용, 없으면 기본값
          heroSlideTemplates: persistedState?.heroSlideTemplates || currentState.heroSlideTemplates,
          // categoryHeroSlides: localStorage에 저장된 데이터가 있으면 사용, 없거나 비어있으면 기본값
          categoryHeroSlides: (persistedState?.categoryHeroSlides && Array.isArray(persistedState.categoryHeroSlides) && persistedState.categoryHeroSlides.length > 0)
            ? persistedState.categoryHeroSlides
            : defaultCategoryHeroSlides,
          // categoryItems: localStorage에 저장된 데이터가 있으면 사용, 없으면 기본값
          categoryItems: (persistedState?.categoryItems && Array.isArray(persistedState.categoryItems) && persistedState.categoryItems.length > 0)
            ? persistedState.categoryItems
            : currentState.categoryItems,
          // subcategoryItems: localStorage에 저장된 데이터가 있으면 사용, 없으면 기본값 (+ 레거시 비스포크 카피 마이그레이션)
          subcategoryItems: migrateLegacyBespokeLabelsSubcategoryItems(
            persistedState?.subcategoryItems &&
              Array.isArray(persistedState.subcategoryItems) &&
              persistedState.subcategoryItems.length >= 0
              ? persistedState.subcategoryItems
              : currentState.subcategoryItems
          ),
          // promoCodes: localStorage에 저장된 데이터가 있으면 사용 (관리자가 추가/수정한 내용 보존)
          // 빈 배열도 유효한 상태이므로, 배열이 존재하면 무조건 사용
          promoCodes: hasPersistedPromoCodes
            ? persistedState.promoCodes
            : currentState.promoCodes,
          // paymentOptions: localStorage에 저장된 데이터가 있으면 사용
          paymentOptions: (persistedState?.paymentOptions && Array.isArray(persistedState.paymentOptions) && persistedState.paymentOptions.length >= 0)
            ? persistedState.paymentOptions
            : currentState.paymentOptions,
          // shippingOptions: localStorage에 저장된 데이터가 있으면 사용
          shippingOptions: (persistedState?.shippingOptions && Array.isArray(persistedState.shippingOptions) && persistedState.shippingOptions.length >= 0)
            ? persistedState.shippingOptions
            : currentState.shippingOptions,
          // freeShippingSettings: localStorage에 저장된 데이터가 있으면 사용
          freeShippingSettings: persistedState?.freeShippingSettings || currentState.freeShippingSettings,
          // pickupLocations: localStorage에 저장된 데이터가 있으면 사용
          pickupLocations: (persistedState?.pickupLocations && Array.isArray(persistedState.pickupLocations) && persistedState.pickupLocations.length >= 0)
            ? persistedState.pickupLocations
            : currentState.pickupLocations,
          // vipGradeBenefits: localStorage에 저장된 데이터가 있으면 사용 (빈 배열이 아닌 경우만)
          vipGradeBenefits: (persistedState?.vipGradeBenefits && Array.isArray(persistedState.vipGradeBenefits) && persistedState.vipGradeBenefits.length > 0)
            ? persistedState.vipGradeBenefits
            : currentState.vipGradeBenefits,
          // vipGradeConfigs: localStorage에 저장된 데이터가 있으면 사용 (빈 배열이 아닌 경우만)
          vipGradeConfigs: (persistedState?.vipGradeConfigs && Array.isArray(persistedState.vipGradeConfigs) && persistedState.vipGradeConfigs.length > 0)
            ? persistedState.vipGradeConfigs
            : currentState.vipGradeConfigs
        }
        console.log('🔄 Merge result:', {
          hasPersistedCategoryHeroSlides: !!(persistedState?.categoryHeroSlides && Array.isArray(persistedState.categoryHeroSlides) && persistedState.categoryHeroSlides.length > 0),
          hasPersistedCategoryItems: !!(persistedState?.categoryItems && Array.isArray(persistedState.categoryItems) && persistedState.categoryItems.length > 0),
          categoryHeroSlidesCount: merged.categoryHeroSlides?.length || 0,
          categoryItemsCount: merged.categoryItems?.length || 0
        })
        return merged
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Date 문자열을 Date 객체로 변환
          if (state.contentItems) {
            state.contentItems = state.contentItems.map(item => ({
              ...item,
              createdAt: typeof item.createdAt === 'string' ? new Date(item.createdAt) : item.createdAt,
              updatedAt: typeof item.updatedAt === 'string' ? new Date(item.updatedAt) : item.updatedAt
            }))
          }
          if (state.sidebarMenuItems) {
            state.sidebarMenuItems = state.sidebarMenuItems.map(item => ({
              ...item,
              createdAt: typeof item.createdAt === 'string' ? new Date(item.createdAt) : item.createdAt,
              updatedAt: typeof item.updatedAt === 'string' ? new Date(item.updatedAt) : item.updatedAt
            }))
          }
          if (state.heroSlides) {
            state.heroSlides = state.heroSlides.map(slide => ({
              ...slide,
              createdAt: typeof slide.createdAt === 'string' ? new Date(slide.createdAt) : slide.createdAt,
              updatedAt: typeof slide.updatedAt === 'string' ? new Date(slide.updatedAt) : slide.updatedAt
            }))
          }
          // categoryHeroSlides가 없거나 비어있으면 기본값으로 설정 (최초 로드 시에만)
          // 단, localStorage에 이미 저장된 데이터가 있는 경우는 기본값으로 덮어쓰지 않음
          if (!state.categoryHeroSlides || !Array.isArray(state.categoryHeroSlides) || state.categoryHeroSlides.length === 0) {
            const storedData = typeof window !== 'undefined' ? localStorage.getItem('content-store') : null
            const hasStoredData = storedData && JSON.parse(storedData)?.state?.categoryHeroSlides?.length > 0
            
            if (!hasStoredData) {
              console.log('⚠️ categoryHeroSlides가 비어있고 저장된 데이터도 없어 기본값으로 설정합니다.')
            state.categoryHeroSlides = defaultCategoryHeroSlides
              // localStorage에 즉시 저장
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('content-store', JSON.stringify({
                    state: {
                      ...state,
                      categoryHeroSlides: defaultCategoryHeroSlides.map(slide => ({
                        ...slide,
                        createdAt: slide.createdAt instanceof Date ? slide.createdAt.toISOString() : slide.createdAt,
                        updatedAt: slide.updatedAt instanceof Date ? slide.updatedAt.toISOString() : slide.updatedAt
                      }))
                    },
                    version: 0
                  }))
                  console.log('✅ categoryHeroSlides 기본값이 localStorage에 저장되었습니다.')
                } catch (error) {
                  console.error('❌ categoryHeroSlides 저장 실패:', error)
                }
              }
            } else {
              console.log('✅ localStorage에 저장된 categoryHeroSlides 데이터를 사용합니다.')
            }
          } else {
            state.categoryHeroSlides = state.categoryHeroSlides.map(slide => ({
              ...slide,
              createdAt: typeof slide.createdAt === 'string' ? new Date(slide.createdAt) : slide.createdAt,
              updatedAt: typeof slide.updatedAt === 'string' ? new Date(slide.updatedAt) : slide.updatedAt
            }))
          }
          if (state.categoryItems) {
            state.categoryItems = state.categoryItems.map(item => ({
              ...item,
              createdAt: typeof item.createdAt === 'string' ? new Date(item.createdAt) : item.createdAt,
              updatedAt: typeof item.updatedAt === 'string' ? new Date(item.updatedAt) : item.updatedAt
            }))
          }
          // subcategoryItems의 Date 객체 변환 + 레거시 /stickers/custom 카피 마이그레이션
          if (state.subcategoryItems) {
            state.subcategoryItems = migrateLegacyBespokeLabelsSubcategoryItems(
              state.subcategoryItems.map((item: any) => ({
                ...item,
                createdAt: typeof item.createdAt === 'string' ? new Date(item.createdAt) : item.createdAt,
                updatedAt: typeof item.updatedAt === 'string' ? new Date(item.updatedAt) : item.updatedAt
              }))
            )
          }
          // promoCodes의 Date 객체 변환
          if (state.promoCodes) {
            console.log('📅 Converting Promo Codes dates:', {
              count: state.promoCodes.length,
              codes: state.promoCodes.map((c: any) => ({
                code: c.code,
                startDate: c.startDate,
                endDate: c.endDate,
                startDateType: typeof c.startDate,
                endDateType: typeof c.endDate
              }))
            })
            state.promoCodes = state.promoCodes.map((code: any) => ({
              ...code,
              startDate: typeof code.startDate === 'string' ? new Date(code.startDate) : code.startDate,
              endDate: typeof code.endDate === 'string' ? new Date(code.endDate) : code.endDate,
              createdAt: typeof code.createdAt === 'string' ? new Date(code.createdAt) : code.createdAt,
              updatedAt: typeof code.updatedAt === 'string' ? new Date(code.updatedAt) : code.updatedAt
            }))
            console.log('✅ Promo Codes dates converted:', {
              count: state.promoCodes.length,
              codes: state.promoCodes.map((c: any) => ({
                code: c.code,
                startDate: c.startDate instanceof Date ? c.startDate.toISOString() : c.startDate,
                endDate: c.endDate instanceof Date ? c.endDate.toISOString() : c.endDate
              }))
            })
          }
          // paymentOptions의 Date 객체 변환
          if (state.paymentOptions) {
            state.paymentOptions = state.paymentOptions.map((option: any) => ({
              ...option,
              createdAt: typeof option.createdAt === 'string' ? new Date(option.createdAt) : option.createdAt,
              updatedAt: typeof option.updatedAt === 'string' ? new Date(option.updatedAt) : option.updatedAt,
              bankAccounts: option.bankAccounts ? option.bankAccounts.map((acc: any) => ({
                ...acc,
                createdAt: typeof acc.createdAt === 'string' ? new Date(acc.createdAt) : acc.createdAt,
                updatedAt: typeof acc.updatedAt === 'string' ? new Date(acc.updatedAt) : acc.updatedAt
              })) : undefined
            }))
          }
          // shippingOptions의 Date 객체 변환
          if (state.shippingOptions) {
            state.shippingOptions = state.shippingOptions.map((option: any) => ({
              ...option,
              createdAt: typeof option.createdAt === 'string' ? new Date(option.createdAt) : option.createdAt,
              updatedAt: typeof option.updatedAt === 'string' ? new Date(option.updatedAt) : option.updatedAt
            }))
          }
          // pickupLocations의 Date 객체 변환
          if (state.pickupLocations) {
            state.pickupLocations = state.pickupLocations.map((location: any) => ({
              ...location,
              createdAt: typeof location.createdAt === 'string' ? new Date(location.createdAt) : location.createdAt,
              updatedAt: typeof location.updatedAt === 'string' ? new Date(location.updatedAt) : location.updatedAt
            }))
          }
          // vipGradeBenefits의 Date 객체 변환
          if (state.vipGradeBenefits) {
            state.vipGradeBenefits = state.vipGradeBenefits.map((benefit: any) => ({
              ...benefit,
              createdAt: typeof benefit.createdAt === 'string' ? new Date(benefit.createdAt) : benefit.createdAt,
              updatedAt: typeof benefit.updatedAt === 'string' ? new Date(benefit.updatedAt) : benefit.updatedAt,
              eventStartDate: benefit.eventStartDate && typeof benefit.eventStartDate === 'string' 
                ? new Date(benefit.eventStartDate) 
                : benefit.eventStartDate,
              eventEndDate: benefit.eventEndDate && typeof benefit.eventEndDate === 'string' 
                ? new Date(benefit.eventEndDate) 
                : benefit.eventEndDate
            }))
          }
          // vipGradeConfigs의 Date 객체 변환 및 누락된 등급 자동 복구
          if (state.vipGradeConfigs && Array.isArray(state.vipGradeConfigs) && state.vipGradeConfigs.length > 0) {
            state.vipGradeConfigs = state.vipGradeConfigs.map((config: any) => ({
              ...config,
              createdAt: typeof config.createdAt === 'string' ? new Date(config.createdAt) : config.createdAt,
              updatedAt: typeof config.updatedAt === 'string' ? new Date(config.updatedAt) : config.updatedAt
            }))
            
            // 누락된 기본 등급 자동 복구 (특히 VVIP)
            const existingCodes = state.vipGradeConfigs.map((c: any) => c.code)
            const requiredCodes = [0, 1, 2, 3, 4] // Basic, Silver, Gold, Black, VVIP
            const missingCodes = requiredCodes.filter(code => !existingCodes.includes(code))
            
            if (missingCodes.length > 0) {
              const missingConfigs: VIPGradeConfig[] = []
              
              if (missingCodes.includes(0)) {
                missingConfigs.push({
                  id: 'grade-config-basic-0',
                  code: 0,
                  name: '일반',
                  nameEn: 'Basic',
                  minAmount: 0,
                  maxAmount: 100,
                  color: 'gray',
                  benefits: ['기본 5% 할인 쿠폰 (자동 할인 없음)'],
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date()
                })
              }
              if (missingCodes.includes(1)) {
                missingConfigs.push({
                  id: 'grade-config-silver-1',
                  code: 1,
                  name: '실버',
                  nameEn: 'Silver',
                  minAmount: 100,
                  maxAmount: 300,
                  color: 'silver',
                  benefits: ['5% 상시 할인', '최대 할인 $10,000', '생일 쿠폰'],
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date()
                })
              }
              if (missingCodes.includes(2)) {
                missingConfigs.push({
                  id: 'grade-config-gold-2',
                  code: 2,
                  name: '골드',
                  nameEn: 'Gold',
                  minAmount: 300,
                  maxAmount: 1000,
                  color: 'gold',
                  benefits: ['10% 상시 할인', '무료 배송', '최대 할인 $20,000'],
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date()
                })
              }
              if (missingCodes.includes(3)) {
                missingConfigs.push({
                  id: 'grade-config-black-3',
                  code: 3,
                  name: '블랙',
                  nameEn: 'Black',
                  minAmount: 1000,
                  maxAmount: 3000,
                  color: 'black',
                  benefits: ['20% 상시 할인', '무료 배송', '최대 할인 $50,000', '전용 고객 센터'],
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date()
                })
              }
              if (missingCodes.includes(4)) {
                missingConfigs.push({
                  id: 'grade-config-vvip-4',
                  code: 4,
                  name: 'VVIP',
                  nameEn: 'VVIP',
                  minAmount: 3000,
                  maxAmount: undefined,
                  color: 'purple',
                  benefits: ['50% 상시 할인', '무료 배송', '최대 할인 $100,000', '특별 선물'],
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date()
                })
              }
              
              // 누락된 등급 추가
              state.vipGradeConfigs = [...state.vipGradeConfigs, ...missingConfigs]
              
              // localStorage에 즉시 저장
              if (typeof window !== 'undefined') {
                try {
                  const currentData = JSON.parse(localStorage.getItem('content-store') || '{}')
                  const updatedData = {
                    ...currentData,
                    state: {
                      ...currentData.state,
                      vipGradeConfigs: state.vipGradeConfigs.map((config: any) => ({
                        ...config,
                        createdAt: config.createdAt instanceof Date ? config.createdAt.toISOString() : config.createdAt,
                        updatedAt: config.updatedAt instanceof Date ? config.updatedAt.toISOString() : config.updatedAt
                      }))
                    }
                  }
                  localStorage.setItem('content-store', JSON.stringify(updatedData))
                  console.log(`✅ 자동 복구: ${missingCodes.length}개의 누락된 등급 복구됨 (${missingCodes.map(c => ['Basic', 'Silver', 'Gold', 'Black', 'VVIP'][c]).join(', ')})`)
                } catch (error) {
                  console.error('❌ 누락된 등급 복구 후 localStorage 저장 실패:', error)
                }
              }
            }
          } else {
            // vipGradeConfigs가 없으면 기본값으로 초기화
            state.vipGradeConfigs = defaultVIPGradeConfigs
          }
          state.setHasHydrated(true)
        }
      }
    }
  )
)

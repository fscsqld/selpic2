import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useDocumentTemplateStore, DocumentType } from './documentTemplateStore'
import { COMPANY_LEGAL, getCompanyBrandName } from './companyLegal'
import { scheduleCatalogSyncToServer } from './catalogSyncScheduler'
import { getOrderItemLineMoney } from '@/lib/orderItemLineTotals'
import { getCustomizationSurchargeLabel } from '@/lib/orderCustomizationSurcharge'
import {
  buildOrderConfirmationEmailPlainText,
  buildOrderConfirmationEmailSubject,
  buildOrderConfirmationEmailHtml
} from '@/lib/orderConfirmationEmail'

export interface Product {
  id: string
  name: string
  price: number
  originalPrice?: number
  image: string
  category: string
  subcategory?: string
  description: string
  customizationOptions?: CustomizationOption[]
  inStock: boolean
  isHotGoods?: boolean
  isPopular?: boolean
  stockQuantity?: number
  safetyStock?: number
  incomingStock?: number
  brand?: string
  /** Device / product model (e.g. phone case compatibility). */
  model?: string
  size?: string
  color?: string
  type?: string
  spfLevel?: string
  isNew?: boolean
  isBestSeller?: boolean
  features?: string[]
  hasDetailPage?: boolean // 상세 페이지 표시 여부
  detailDescription?: string // 상세 페이지 전용 상세 설명
  setItemCount?: number // SET 상품인 경우 포함된 아이템 개수 (기본값: 3)
  bundleItems?: BundleItem[] // 묶음 상품인 경우 포함된 상품들
  isBundle?: boolean // 묶음 상품 여부
  fallbackImage?: string // 🆕 동영상 로딩 전 표시할 Fallback 이미지
  /** 네임스티커 시트지 수량. 가격은 3장 기준. 관리자 미설정 시 모든 커스텀 네임스티커 기본 3장. */
  stickerSheetQuantity?: number
  /** 관리자 설정 스티커 치수(mm). 모두 있으면 커스텀/미리보기에서 이 값 사용. */
  stickerWidthMm?: number
  stickerHeightMm?: number
  stickerCols?: number
  stickerRows?: number
  stickerGapMm?: number
  /** When true, sticker design has an image (e.g. icon on left); text is placed to avoid overlapping it. */
  stickerHasImage?: boolean
  /** Extra charge when customer uses 2-line option (affiliation+name or name+phone). Set in admin when registering product. */
  twoLineSurcharge?: number
  /** 평점 (0–5). Edit Product에서 설정. */
  rating?: number
  /** 리뷰 수. Edit Product에서 설정. */
  reviews?: number
  /** Catalog sync / public API merge timestamp (ISO string). */
  updatedAt?: string
}

export interface BundleItem {
  productId: string // 포함된 상품의 ID
  category: 'Stamps' | 'Stickers' | 'PhoneCases' | 'HotGoods' // 상품 카테고리
  name: string // 상품 이름 (참조용)
  image: string // 상품 이미지 (참조용)
}

export interface CustomizationOption {
  id: string
  name: string
  type: 'color' | 'size' | 'text' | 'image'
  options?: string[]
  required: boolean
  price?: number
}

export interface CartItem {
  product: Product
  quantity: number
  customizations: Record<string, string>
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'cancelled'
  /** Admin/accounting approval step (e.g. before processing) */
  | 'approved'

/** Sales channel for unified order management (DB column `platform_source` mirrors this). */
export type OrderPlatformSource = 'website' | 'etsy' | 'ebay' | 'amazon'

export const ORDER_PLATFORM_SOURCES: OrderPlatformSource[] = ['website', 'etsy', 'ebay', 'amazon']

export const ORDER_PLATFORM_LABEL: Record<OrderPlatformSource, string> = {
  website: 'Website',
  etsy: 'Etsy',
  ebay: 'eBay',
  amazon: 'Amazon',
}

export interface OrderItemSnapshot {
  productId: string
  name: string
  /** Unit price GST-inclusive: base catalogue price + customization surcharges per unit */
  price: number
  /** Catalogue unit price (GST-inclusive) before option surcharges */
  baseUnitPrice?: number
  /** Per-unit add-on from customization options (GST-inclusive), e.g. 2-line labels */
  customizationSurchargePerUnit?: number
  image: string
  quantity: number
  customizations: Record<string, string>
  /** Mass per sellable unit (kg), for shipping labels; optional until catalog or admin sets it. */
  weightKg?: number
  /** Etsy / marketplace buyer-entered personalization (merged text). */
  buyerPersonalization?: string
  /** Structured prompts → answers when the marketplace provides them. */
  personalizationResponses?: Array<{ label: string; value: string; promptId?: string }>
  category?: string
  subcategory?: string
  brand?: string
  size?: string
  color?: string
  type?: string
  spfLevel?: string
  isNew?: boolean
  isBestSeller?: boolean
  isPopular?: boolean
  inStock?: boolean
  features?: string[]
  stockQuantityAtOrder?: number
  remainingStock?: number
  safetyStock?: number
  incomingStock?: number
  bundleItems?: BundleItem[]
  isBundle?: boolean
}

/** AusPost label metadata on the order (internal PDF until live Digital API is wired). */
export interface AusPostShippingLabelMeta {
  status: 'created' | 'failed'
  /** `internal` = SELPIC-generated PDF; `live` = AusPost Digital API when wired. Legacy payloads may still say `mock` (treated as internal). */
  mode: 'internal' | 'live' | 'mock'
  labelUrl?: string
  shipmentId?: string
  trackingNumber?: string
  lastError?: string
  createdAtIso?: string
  updatedAtIso?: string
}

export interface OrderRecord {
  id: string
  createdAtIso: string
  /** Origin channel; defaults to website when omitted in legacy payloads. */
  platformSource?: OrderPlatformSource
  /** Dedupe key in DB, e.g. `etsy:123456789`. */
  externalOrderKey?: string
  /** Extra ids for support / re-sync (optional). */
  marketplaceSource?: {
    etsyReceiptId?: number
    etsyShopId?: number
    lastImportedAtIso?: string
  }
  items: OrderItemSnapshot[]
  subtotal: number
  shippingPrice: number
  discount?: number // 총 할인 (VIP + 프로모션)
  vipDiscount?: number // VIP 등급 할인 (별도 저장)
  vipGradeCode?: number // VIP 등급 코드
  vipGradeName?: string // VIP 등급명
  promoCode?: string
  promoDiscount?: number // 프로모션 코드 할인 (별도 저장)
  paymentFee?: number
  /** GST amount when stored separately; else often inferred as total/11 (10% inclusive). */
  gst?: number
  total: number
  shippingOptionId: string
  shippingOptionName?: string
  paymentMethod: 'card' | 'paypal' | 'bank' | 'cash' | 'stripe' | 'marketplace'
  paymentMethodName?: string
  status: OrderStatus
  customer: {
    name: string
    firstName?: string
    lastName?: string
    email: string
    phone: string
  }
  address: {
    streetAddress: string
    suburb: string
    state: string
    postcode: string
    country: string
    asSingleLine: string
  }
  /** Set when order was paid via Stripe Checkout (dedupe / ledger). */
  stripeCheckoutSessionId?: string
  // 배송 추적 정보 추가
  tracking?: {
    number: string
    provider: string
    status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned'
    estimatedDelivery: string
    actualDelivery?: string
    currentLocation?: string
    lastUpdate: string
    history: Array<{
      timestamp: string
      status: string
      location: string
      description: string
    }>
    notes?: string
  }
  /** Optional declared total shipping mass (kg); when set, overrides summed line-item weights on labels. */
  declaredShippingWeightKg?: number
  /** AusPost shipping label (admin): internal PDF by default; live API optional later. */
  ausPostShippingLabel?: AusPostShippingLabelMeta
  // 이메일 확인 관련
  emailConfirmation?: {
    sent: boolean
    sentAt?: string
    status: 'pending' | 'sent' | 'failed' | 'delivered'
    attempts: number
    lastAttempt?: string
    errorMessage?: string
  }
  /** Receipt email (PDF) — bank transfer: usually sent manually after admin confirms deposit */
  receiptEmail?: {
    sent: boolean
    sentAt?: string
  }
  // 주문 이력 및 감사 로그
  auditLog?: Array<{
    id: string
    timestamp: string
    action: 'status_changed' | 'customer_updated' | 'items_updated' | 'discount_updated' | 'shipping_updated' | 'note_added' | 'note_updated' | 'note_deleted' | 'deleted'
    performedBy: string // 관리자 이름 또는 'system'
    changes?: {
      field: string
      oldValue: any
      newValue: any
    }[]
    description?: string
  }>
  // 관리자 메모 (내부 메모)
  adminNotes?: Array<{
    id: string
    content: string
    createdAt: string
    createdBy: string
    updatedAt?: string
    updatedBy?: string
  }>
}

export interface StockMovement {
  id: string
  productId: string
  type: 'in' | 'out' | 'adjust'
  quantity: number
  reason?: string
  source?: 'order' | 'manual' | 'restock'
  createdAt: string
  resultingStock: number
}

const DEFAULT_STOCK_LEVEL = 100
const DEFAULT_SAFETY_STOCK = 10
const MAX_STOCK_HISTORY = 500
const MAX_STORED_ORDERS = 10
const MAX_STORED_PRODUCTS = 500 // 최대 저장 가능한 제품 수

const sanitizeCustomizations = (customizations: Record<string, string> = {}) => {
  if (!customizations) return {}
  const cleanedEntries = Object.entries(customizations).filter(
    ([key]) => !key.toLowerCase().includes('customizedimage')
  )
  return cleanedEntries.length === 0 ? {} : Object.fromEntries(cleanedEntries)
}

const sanitizeOrderItem = (item: OrderItemSnapshot): OrderItemSnapshot => ({
  ...item,
  customizations: sanitizeCustomizations(item.customizations),
  bundleItems: item.bundleItems?.map(bundle => ({
    productId: bundle.productId,
    category: bundle.category,
    name: bundle.name,
    image: bundle.image
  })),
  features: undefined,
  stockQuantityAtOrder: undefined,
  remainingStock: undefined,
  safetyStock: undefined,
  incomingStock: undefined
})

const sanitizeCartItem = (item: CartItem): CartItem => ({
  ...item,
  customizations: sanitizeCustomizations(item.customizations)
})

const sanitizeOrder = (order: OrderRecord): OrderRecord => ({
  ...order,
  items: order.items.map(sanitizeOrderItem)
})

// 제품 저장 시 큰 데이터 정리 (로컬 스토리지 할당량 관리)
const sanitizeProduct = (product: Product): Product => {
  // base64 이미지가 너무 큰 경우 (100KB 이상) 경고만 하고 그대로 저장
  // 실제로는 이미지 URL을 사용하는 것이 권장됨
  const sanitized = { ...product }
  
  // bundleItems의 이미지가 base64인 경우 크기 제한
  if (sanitized.bundleItems && sanitized.bundleItems.length > 0) {
    sanitized.bundleItems = sanitized.bundleItems.map(item => ({
      ...item,
      // 이미지가 base64이고 너무 크면 빈 문자열로 변경 (실제로는 URL 사용 권장)
      image: item.image && item.image.startsWith('data:image') && item.image.length > 50000
        ? '' // 너무 큰 base64 이미지는 제거
        : item.image
    }))
  }
  
  return sanitized
}

const normalizeProductStock = (product: Product): Product => {
  const baseStock =
    typeof product.stockQuantity === 'number'
      ? Math.max(0, product.stockQuantity)
      : (product.inStock ? DEFAULT_STOCK_LEVEL : 0)

  return {
    ...product,
    stockQuantity: baseStock,
    safetyStock: product.safetyStock ?? Math.min(DEFAULT_SAFETY_STOCK, baseStock),
    incomingStock: product.incomingStock ?? 0,
    inStock: baseStock > 0
  }
}

const generateStockMovementId = () =>
  `stock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const getAvailableStock = (product?: Product): number => {
  if (!product) return 0
  const stock = (product as any).stockQuantity
  if (typeof stock === 'number') {
    return Math.max(0, stock)
  }
  return product.inStock ? DEFAULT_STOCK_LEVEL : 0
}

// Newsletter 구독자 인터페이스
export interface NewsletterSubscriber {
  id: string
  email: string
  subscribedAt: string
  isActive: boolean
  unsubscribedAt?: string
}

// Newsletter 발송 이력 인터페이스
export interface NewsletterCampaign {
  id: string
  subject: string
  message: string
  type: 'promotion' | 'announcement' | 'event' | 'newsletter' | 'general'
  sentAt: string
  sentBy: string
  recipientCount: number
  recipientIds?: string[] // 선택된 구독자 ID 목록
  status: 'sent' | 'failed' | 'pending'
  successCount?: number
  failedCount?: number
}

// Newsletter 템플릿 인터페이스
export interface NewsletterTemplate {
  id: string
  name: string
  subject: string
  message: string
  type: 'promotion' | 'announcement' | 'event' | 'newsletter' | 'general'
  createdAt: string
  updatedAt: string
  isDefault?: boolean
}

import { Currency, DateFormat, Timezone } from './formatUtils'

interface Store {
  // Hydration 상태
  _hasHydrated: boolean
  // 상품 관련
  products: Product[]
  selectedProduct: Product | null
  addProduct: (product: Product) => void
  updateProduct: (product: Product) => void
  deleteProduct: (productId: string) => void
  refreshProducts: () => void
  
  // 장바구니 관련
  cart: CartItem[]
  addToCart: (item: CartItem, isLoggedIn: boolean) => boolean
  removeFromCart: (productId: string, quantity: number, isLoggedIn: boolean) => boolean
  updateCartItemQuantity: (productId: string, quantity: number, isLoggedIn: boolean) => boolean
  clearCart: (isLoggedIn: boolean) => boolean

  // 주문 관련
  orders: OrderRecord[]
  createOrder: (order: Omit<OrderRecord, 'id' | 'createdAtIso'>) => string
  /** Merge server-backed orders (e.g. Supabase) with local orders; does not adjust stock. */
  mergeOrdersFromServer: (incoming: OrderRecord[]) => void
  updateOrderStatus: (orderId: string, status: OrderStatus, performedBy?: string) => void
  deleteOrder: (orderId: string, performedBy?: string) => void
  /** 다른 탭/창에서 고객이 주문했을 때 localStorage에서 주문 목록을 다시 읽어와 관리자 화면에 반영 */
  refreshOrdersFromStorage: () => void
  // 주문 수정 기능
  updateOrderCustomer: (orderId: string, customer: Partial<OrderRecord['customer']>, performedBy?: string) => void
  updateOrderAddress: (orderId: string, address: Partial<OrderRecord['address']>, performedBy?: string) => void
  updateOrderItems: (orderId: string, items: OrderRecord['items'], performedBy?: string) => void
  updateOrderDiscounts: (orderId: string, discounts: { vipDiscount?: number; promoDiscount?: number; promoCode?: string }, performedBy?: string) => void
  updateOrderShipping: (orderId: string, shippingOptionId: string, shippingOptionName?: string, performedBy?: string) => void
  recalculateOrderTotal: (orderId: string) => void
  // 주문 메모 관리
  addOrderNote: (orderId: string, content: string, createdBy: string) => void
  updateOrderNote: (orderId: string, noteId: string, content: string, updatedBy: string) => void
  deleteOrderNote: (orderId: string, noteId: string, deletedBy: string) => void

  // 재고 관리
  stockMovements: StockMovement[]
  adjustProductStock: (productId: string, delta: number, reason?: string, source?: StockMovement['source']) => void
  recordStockMovement: (movement: Omit<StockMovement, 'id' | 'createdAt'>) => void
  
  // 배송 추적 관련
  updateOrderTracking: (orderId: string, trackingInfo: OrderRecord['tracking']) => void
  addTrackingNumber: (orderId: string, trackingNumber: string, provider: string) => void
  updateDeliveryStatus: (orderId: string, status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned', location: string, description: string) => void
  
  // 이메일 확인 관련
  replaceTemplatePlaceholders: (text: string, variables: Record<string, string | number>) => string
  generateEmailContent: (template: any, order: OrderRecord, companyName: string) => string
  sendOrderConfirmationEmail: (orderId: string) => Promise<boolean>
  resendOrderConfirmationEmail: (orderId: string) => Promise<boolean>
  sendShippingNotificationEmail: (orderId: string) => Promise<boolean>
  sendReceiptEmail: (orderId: string) => Promise<boolean>
  updateEmailConfirmationStatus: (orderId: string, status: 'pending' | 'sent' | 'failed' | 'delivered', errorMessage?: string) => void
  
  // 커스터마이징 관련
  customizations: Record<string, any>
  updateCustomization: (productId: string, customization: Record<string, any>) => void
  
  // UI 상태
  isCustomizationModalOpen: boolean
  setIsCustomizationModalOpen: (open: boolean) => void
  
  // 언어 설정
  language: 'ko' | 'en'
  setLanguage: (language: 'ko' | 'en') => void
  
  // 포맷 설정 (관리자 Settings에서 설정)
  currency: Currency
  setCurrency: (currency: Currency) => void
  dateFormat: DateFormat
  setDateFormat: (format: DateFormat) => void
  timezone: Timezone
  setTimezone: (timezone: Timezone) => void
  
  // UI 설정 (관리자 Settings에서 설정)
  defaultPageSize: number
  setDefaultPageSize: (size: number) => void
  theme: 'light' | 'dark' | 'auto'
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
  autoRefreshInterval: number // milliseconds, 0 = off
  setAutoRefreshInterval: (interval: number) => void
  
  // 사용자 관련
  user: {
    id: string
    name: string
    email: string
    phone?: string
    address?: string
    preferences?: Record<string, any>
  } | null
  setUser: (user: any) => void
  
  // Newsletter 구독자 관련
  newsletterSubscribers: NewsletterSubscriber[]
  subscribeToNewsletter: (email: string) => boolean
  unsubscribeFromNewsletter: (email: string) => boolean
  deleteNewsletterSubscriber: (id: string) => void
  getActiveNewsletterSubscribers: () => NewsletterSubscriber[]
  
  // Newsletter 발송 이력 관련
  newsletterCampaigns: NewsletterCampaign[]
  sendNewsletterCampaign: (campaign: Omit<NewsletterCampaign, 'id' | 'sentAt' | 'status' | 'successCount' | 'failedCount'>) => Promise<boolean>
  getNewsletterCampaigns: () => NewsletterCampaign[]
  deleteNewsletterCampaign: (id: string) => void
  
  // Newsletter 템플릿 관련
  newsletterTemplates: NewsletterTemplate[]
  saveNewsletterTemplate: (template: Omit<NewsletterTemplate, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateNewsletterTemplate: (id: string, template: Partial<Omit<NewsletterTemplate, 'id' | 'createdAt'>>) => void
  deleteNewsletterTemplate: (id: string) => void
  getNewsletterTemplate: (id: string) => NewsletterTemplate | undefined
  getNewsletterTemplatesByType: (type: NewsletterTemplate['type']) => NewsletterTemplate[]
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      // 🔧 초기 상품 데이터는 빈 배열로 설정 (localStorage에서 복원되거나 관리자가 추가한 데이터만 사용)
      // 하드코딩된 데이터는 localStorage를 덮어쓰지 않도록 완전히 제거
      // 관리자는 Product Management 페이지에서 상품을 직접 추가해야 함
      products: [],
      stockMovements: [],
      selectedProduct: null,
      cart: [],
      orders: [],
      customizations: {},
      isCustomizationModalOpen: false,
      language: 'en',
      user: null,

      // 장바구니 관련 메서드
      addToCart: (item, isLoggedIn) => {
        // Validate item before adding to cart
        if (!item || 
            !item.product || 
            typeof item.product !== 'object' || 
            !item.product.id || 
            typeof item.product.price !== 'number' ||
            typeof item.quantity !== 'number' ||
            item.quantity <= 0) {
          console.error('Invalid item cannot be added to cart:', item)
          return false
        }

        const { cart, products } = get()
        const storeProduct = products.find(p => p.id === item.product.id)
        
        // 커스텀 제품인 경우 (Custom Design Studio에서 생성된 제품) 허용
        const isCustomProduct = item.product.id.startsWith('custom-') || 
                                 item.product.category === 'Custom Design' ||
                                 item.product.category === 'Stickers' ||
                                 item.product.category === 'Stamps'
        
        if (!storeProduct && !isCustomProduct) {
          console.error('Product not found for cart add:', item.product.id)
          return false
        }
        
        // 커스텀 제품인 경우 item.product를 직접 사용, 아니면 storeProduct 사용
        const productToUse = storeProduct || item.product

        const existingItem = cart.find(cartItem => 
          cartItem && 
          cartItem.product && 
          cartItem.product.id === item.product.id &&
          JSON.stringify(cartItem.customizations) === JSON.stringify(item.customizations)
        )

        // 커스텀 제품은 재고 체크 스킵
        if (!isCustomProduct) {
          const availableStock = getAvailableStock(productToUse)
          const existingQty = existingItem ? existingItem.quantity : 0
          const requestedQty = item.quantity + existingQty

          if (availableStock < requestedQty) {
            console.warn(`Insufficient stock for product ${productToUse.name}. Requested ${requestedQty}, available ${availableStock}.`)
            return false
          }
        }

        const productSnapshot = { ...productToUse }
        const updatedCart = existingItem
          ? cart.map(cartItem =>
              cartItem === existingItem
                ? {
                    ...cartItem,
                    product: productSnapshot,
                    quantity: cartItem.quantity + item.quantity,
                    customizations: sanitizeCustomizations(item.customizations)
                  }
                : cartItem
            )
          : [
              ...cart,
              {
                ...item,
                product: productSnapshot,
                customizations: sanitizeCustomizations(item.customizations)
              }
            ]

        set({ cart: updatedCart.map(sanitizeCartItem) })
        return true
      },

      removeFromCart: (productId, quantity, isLoggedIn) => {
        if (!productId) {
          console.error('Invalid productId for removal:', productId)
          return false
        }
        
        const { cart } = get()
        set({ cart: cart.filter(item => 
          item && 
          item.product && 
          item.product.id !== productId
        ) })
        return true
      },

      updateCartItemQuantity: (productId, quantity, isLoggedIn) => {
        if (!productId || typeof quantity !== 'number' || quantity < 0) {
          console.error('Invalid parameters for quantity update:', { productId, quantity })
          return false
        }

        const { cart, products } = get()
        const storeProduct = products.find(p => p.id === productId)
        if (!storeProduct) {
          console.error('Product not found for quantity update:', productId)
          return false
        }

        const availableStock = getAvailableStock(storeProduct)
        if (quantity > availableStock) {
          console.warn(`Cannot set quantity to ${quantity}. Available stock for ${storeProduct.name} is ${availableStock}.`)
          return false
        }

        const updatedCart = cart
          .map(item => {
            if (item && item.product && item.product.id === productId) {
              const newQty = Math.max(0, quantity)
              if (newQty === 0) {
                return null
              }
              return {
                ...item,
                quantity: newQty,
                product: { ...storeProduct }
              }
            }
            return item
          })
          .filter((item): item is CartItem => !!item && !!item.product && item.quantity > 0)

        set({ cart: updatedCart.map(sanitizeCartItem) })
        return true
      },

      clearCart: (isLoggedIn) => {
        set({ cart: [] })
        return true
      },

      // 주문 관련 메서드
      createOrder: (orderInput) => {
        // Base36 인코딩을 사용하여 주문 ID를 짧게 생성
        // 예: ORD-lx3k2j1 (11자) vs ORD-1765424529434 (17자)
        const id = `ORD-${Date.now().toString(36)}`
        const createdAtIso = new Date().toISOString()
        const sanitizedInput: OrderRecord = sanitizeOrder({
          id,
          createdAtIso,
          ...orderInput,
          items: orderInput.items?.map(item => ({
            ...item,
            customizations: sanitizeCustomizations(item.customizations)
          })) || []
        })

        const { orders } = get()
        const sanitizedExistingOrders = orders.map(sanitizeOrder)
        const updatedOrders = [sanitizedInput, ...sanitizedExistingOrders].slice(0, MAX_STORED_ORDERS)
        set({ orders: updatedOrders, cart: [] })

        // Keep other tabs + admin views in sync (persist may write async; storage event only fires in *other* tabs)
        if (typeof window !== 'undefined') {
          queueMicrotask(() => {
            try {
              const raw = localStorage.getItem('selpic-store')
              if (raw) {
                const parsed = JSON.parse(raw) as { state?: { orders?: OrderRecord[] }; orders?: OrderRecord[] }
                const ord = get().orders
                if (parsed && typeof parsed === 'object') {
                  if (parsed.state && typeof parsed.state === 'object') {
                    ;(parsed.state as { orders: OrderRecord[] }).orders = ord
                  } else {
                    ;(parsed as { orders: OrderRecord[] }).orders = ord
                  }
                  localStorage.setItem('selpic-store', JSON.stringify(parsed))
                }
              }
            } catch (e) {
              console.warn('[Store] createOrder: localStorage orders sync failed:', e)
            }
            window.dispatchEvent(
              new CustomEvent('selpic-store-orders-updated', { detail: { orderId: id } })
            )
          })
        }

        if (orderInput.items && orderInput.items.length > 0) {
          orderInput.items.forEach(item => {
            if (item?.productId && item.quantity) {
              get().adjustProductStock(item.productId, -item.quantity, `Order ${id}`, 'order')
            }
          })
        }
        
        // VIP 등급 시스템: 주문 생성 시 등급 업데이트
        // 비동기로 처리하여 순환 참조 방지
        if (orderInput.customer?.email) {
          setTimeout(() => {
            try {
              // 동적 import로 순환 참조 방지
              import('@/lib/userGradeUtils').then(({ updateUserGrade }) => {
                import('@/lib/userAuth').then(({ useUserAuth }) => {
                  const { users, updateUser } = useUserAuth.getState()
                  const user = users.find(u => 
                    (u.email || '').trim().toLowerCase() === (orderInput.customer?.email || '').trim().toLowerCase()
                  )
                  if (user) {
                    updateUserGrade(user, updatedOrders, updateUser)
                  }
                })
              })
            } catch (error) {
              console.error('Error updating user grade:', error)
            }
          }, 100)
        }
        
        return id
      },

      mergeOrdersFromServer: (incoming) => {
        if (!incoming?.length) return
        const { orders: prev } = get()
        const byId = new Map<string, OrderRecord>()
        const byStripeSession = new Map<string, OrderRecord>()

        for (const o of incoming) {
          const sanitized = sanitizeOrder(o)
          byId.set(sanitized.id, sanitized)
          if (sanitized.stripeCheckoutSessionId) {
            byStripeSession.set(sanitized.stripeCheckoutSessionId, sanitized)
          }
        }

        for (const o of prev) {
          const sanitized = sanitizeOrder(o)
          if (sanitized.stripeCheckoutSessionId && byStripeSession.has(sanitized.stripeCheckoutSessionId)) {
            continue
          }
          if (!byId.has(sanitized.id)) {
            byId.set(sanitized.id, sanitized)
          }
        }

        const merged = Array.from(byId.values())
          .sort((a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime())
          .slice(0, MAX_STORED_ORDERS)

        set({ orders: merged })

        if (typeof window !== 'undefined') {
          queueMicrotask(() => {
            try {
              const raw = localStorage.getItem('selpic-store')
              if (raw) {
                const parsed = JSON.parse(raw) as { state?: { orders?: OrderRecord[] }; orders?: OrderRecord[] }
                const ord = get().orders
                if (parsed && typeof parsed === 'object') {
                  if (parsed.state && typeof parsed.state === 'object') {
                    ;(parsed.state as { orders: OrderRecord[] }).orders = ord
                  } else {
                    ;(parsed as { orders: OrderRecord[] }).orders = ord
                  }
                  localStorage.setItem('selpic-store', JSON.stringify(parsed))
                }
              }
            } catch (e) {
              console.warn('[Store] mergeOrdersFromServer: localStorage sync failed:', e)
            }
            window.dispatchEvent(new CustomEvent('selpic-store-orders-updated', { detail: { source: 'server' } }))
          })
        }
      },

      updateOrderStatus: (orderId, status, performedBy = 'system') => {
        const { orders } = get()
        const previousOrder = orders.find(o => o.id === orderId)
        if (!previousOrder) return
        
        const updatedOrders = orders.map(o => {
          if (o.id === orderId) {
            const auditEntry = {
              id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString(),
              action: 'status_changed' as const,
              performedBy,
              changes: [{
                field: 'status',
                oldValue: previousOrder.status,
                newValue: status
              }],
              description: `Order status changed from ${previousOrder.status} to ${status}`
            }
            return {
              ...o,
              status,
              auditLog: [...(o.auditLog || []), auditEntry]
            }
          }
          return o
        })
        set({ orders: updatedOrders })
        
        const order = updatedOrders.find((o) => o.id === orderId)

        // VIP 등급 시스템: 결제/이행/취소 상태 변경 시 등급 재계산
        // - paid/approved/processing/shipped: 누적 구매액 반영
        // - cancelled: 누적 구매액 제외 반영
        const shouldRecalculateGrade =
          status !== previousOrder?.status &&
          ['paid', 'approved', 'processing', 'shipped', 'cancelled'].includes(status)
        if (shouldRecalculateGrade && order?.customer?.email) {
          setTimeout(() => {
            try {
              import('@/lib/userGradeUtils').then(({ updateUserGrade }) => {
                import('@/lib/userAuth').then(({ useUserAuth }) => {
                  const { users, updateUser } = useUserAuth.getState()
                  const user = users.find(
                    (u) =>
                      (u.email || '').trim().toLowerCase() === (order.customer?.email || '').trim().toLowerCase()
                  )
                  if (user) {
                    updateUserGrade(user, updatedOrders, updateUser)
                  }
                })
              })
            } catch (error) {
              console.error('Error updating user grade:', error)
            }
          }, 100)
        }

        // Shipping Notification 이메일 자동 발송 (추적 정보가 있는 경우)
        if (status === 'shipped' && previousOrder?.status !== 'shipped' && order?.tracking?.number) {
          setTimeout(() => {
            get().sendShippingNotificationEmail(orderId).catch(error => {
              console.error('Failed to send shipping notification email:', error)
            })
          }, 200)
        }
        
        // When marked paid: confirmation email (always); receipt skipped for bank (admin sends via sendAdminOrderEmailAction / receipt button).
        // Prefer Supabase-backed sendAdminOrderEmailAction so Supabase admins don't depend on legacy adminAuth or CMS templates.
        if (status === 'paid') {
          setTimeout(() => {
            void (async () => {
              const markConfirmationSent = () => {
                const sentAt = new Date().toISOString()
                set({
                  orders: get().orders.map((o) =>
                    o.id === orderId
                      ? {
                          ...o,
                          emailConfirmation: {
                            sent: true,
                            sentAt,
                            status: 'sent' as const,
                            attempts: (o.emailConfirmation?.attempts || 0) + 1,
                            lastAttempt: sentAt,
                          },
                        }
                      : o
                  ),
                })
              }
              const markReceiptSent = () => {
                const sentAt = new Date().toISOString()
                set({
                  orders: get().orders.map((o) =>
                    o.id === orderId ? { ...o, receiptEmail: { sent: true, sentAt } } : o
                  ),
                })
              }

              try {
                const { sendAdminOrderEmailAction } = await import('@/app/actions/emails')
                const conf = await sendAdminOrderEmailAction({ orderId, kind: 'confirmation' })
                if (conf.ok) {
                  markConfirmationSent()
                } else {
                  await get().sendOrderConfirmationEmail(orderId)
                }
              } catch {
                await get().sendOrderConfirmationEmail(orderId)
              }

              const after = get().orders.find((o) => o.id === orderId)
              if (
                after &&
                after.paymentMethod !== 'bank' &&
                !after.receiptEmail?.sent
              ) {
                try {
                  const { sendAdminOrderEmailAction } = await import('@/app/actions/emails')
                  const rec = await sendAdminOrderEmailAction({ orderId, kind: 'receipt' })
                  if (rec.ok) {
                    markReceiptSent()
                  } else {
                    await get().sendReceiptEmail(orderId)
                  }
                } catch {
                  await get().sendReceiptEmail(orderId)
                }
              }
            })()
          }, 100)
        }
      },

      deleteOrder: (orderId, _performedBy = 'system') => {
        const { orders } = get()
        const updatedOrders = orders.filter(o => o.id !== orderId)
        set({ orders: updatedOrders })

        // Ensure localStorage is updated immediately (some UIs manually re-sync from storage).
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('selpic-store')
            if (raw) {
              const parsed = JSON.parse(raw) as any
              if (parsed && typeof parsed === 'object') {
                if (parsed.state && typeof parsed.state === 'object') {
                  parsed.state.orders = updatedOrders
                } else {
                  parsed.orders = updatedOrders
                }
                localStorage.setItem('selpic-store', JSON.stringify(parsed))
              }
            }
          } catch (e) {
            console.warn('[Store] Failed to persist deleted order to localStorage:', e)
          }

          // Remove from Supabase ledger so the next mergeOrdersFromServer poll does not resurrect the row.
          void fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
            method: 'DELETE',
            credentials: 'same-origin',
          })
            .then(async (res) => {
              if (!res.ok && res.status !== 401 && res.status !== 404) {
                console.warn('[Store] deleteOrder: server DELETE failed', res.status)
              }
            })
            .catch(() => {
              /* network — local delete already applied */
            })
        }
      },

      refreshOrdersFromStorage: () => {
        if (typeof window === 'undefined') return
        try {
          const raw = localStorage.getItem('selpic-store')
          if (!raw) return
          const parsed = JSON.parse(raw) as { state?: { orders?: OrderRecord[] }; orders?: OrderRecord[] }
          const stored = parsed?.state?.orders ?? parsed?.orders
          if (stored && Array.isArray(stored)) {
            set({ orders: stored })
          }
        } catch (e) {
          console.warn('[Store] refreshOrdersFromStorage failed:', e)
        }
      },

      // 주문 수정 기능
      updateOrderCustomer: (orderId, customer, performedBy = 'system') => {
        const { orders } = get()
        const order = orders.find(o => o.id === orderId)
        if (!order) return
        
        const changes: Array<{ field: string; oldValue: any; newValue: any }> = []
        Object.keys(customer).forEach(key => {
          const oldVal = (order.customer as any)[key]
          const newVal = (customer as any)[key]
          if (oldVal !== newVal) {
            changes.push({ field: `customer.${key}`, oldValue: oldVal, newValue: newVal })
          }
        })
        
        if (changes.length > 0) {
          const auditEntry = {
            id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            action: 'customer_updated' as const,
            performedBy,
            changes,
            description: `Customer information updated`
          }
          
          set({
            orders: orders.map(o => o.id === orderId ? {
              ...o,
              customer: { ...o.customer, ...customer },
              auditLog: [...(o.auditLog || []), auditEntry]
            } : o)
          })
          get().recalculateOrderTotal(orderId)
        }
      },

      updateOrderAddress: (orderId, address, performedBy = 'system') => {
        const { orders } = get()
        const order = orders.find(o => o.id === orderId)
        if (!order) return
        
        const changes: Array<{ field: string; oldValue: any; newValue: any }> = []
        Object.keys(address).forEach(key => {
          const oldVal = (order.address as any)[key]
          const newVal = (address as any)[key]
          if (oldVal !== newVal) {
            changes.push({ field: `address.${key}`, oldValue: oldVal, newValue: newVal })
          }
        })
        
        if (changes.length > 0) {
          const asSingleLine = address.streetAddress && address.suburb && address.state && address.postcode
            ? `${address.streetAddress}, ${[address.suburb, address.state, address.postcode, address.country || order.address.country].filter(Boolean).join(' ')}`
            : order.address.asSingleLine
          
          const auditEntry = {
            id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            action: 'shipping_updated' as const,
            performedBy,
            changes,
            description: `Shipping address updated`
          }
          
          set({
            orders: orders.map(o => o.id === orderId ? {
              ...o,
              address: { ...o.address, ...address, asSingleLine },
              auditLog: [...(o.auditLog || []), auditEntry]
            } : o)
          })
        }
      },

      updateOrderItems: (orderId, items, performedBy = 'system') => {
        const { orders } = get()
        const order = orders.find(o => o.id === orderId)
        if (!order) return
        
        const auditEntry = {
          id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'items_updated' as const,
          performedBy,
          changes: [{
            field: 'items',
            oldValue: order.items.length,
            newValue: items.length
          }],
          description: `Order items updated (${order.items.length} → ${items.length} items)`
        }
        
        set({
          orders: orders.map(o => o.id === orderId ? {
            ...o,
            items,
            auditLog: [...(o.auditLog || []), auditEntry]
          } : o)
        })
        get().recalculateOrderTotal(orderId)
      },

      updateOrderDiscounts: (orderId, discounts, performedBy = 'system') => {
        const { orders } = get()
        const order = orders.find(o => o.id === orderId)
        if (!order) return
        
        const changes: Array<{ field: string; oldValue: any; newValue: any }> = []
        if (discounts.vipDiscount !== undefined && discounts.vipDiscount !== order.vipDiscount) {
          changes.push({ field: 'vipDiscount', oldValue: order.vipDiscount, newValue: discounts.vipDiscount })
        }
        if (discounts.promoDiscount !== undefined && discounts.promoDiscount !== order.promoDiscount) {
          changes.push({ field: 'promoDiscount', oldValue: order.promoDiscount, newValue: discounts.promoDiscount })
        }
        if (discounts.promoCode !== undefined && discounts.promoCode !== order.promoCode) {
          changes.push({ field: 'promoCode', oldValue: order.promoCode, newValue: discounts.promoCode })
        }
        
        if (changes.length > 0) {
          const auditEntry = {
            id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            action: 'discount_updated' as const,
            performedBy,
            changes,
            description: `Discounts updated`
          }
          
          set({
            orders: orders.map(o => o.id === orderId ? {
              ...o,
              vipDiscount: discounts.vipDiscount !== undefined ? discounts.vipDiscount : o.vipDiscount,
              promoDiscount: discounts.promoDiscount !== undefined ? discounts.promoDiscount : o.promoDiscount,
              promoCode: discounts.promoCode !== undefined ? discounts.promoCode : o.promoCode,
              auditLog: [...(o.auditLog || []), auditEntry]
            } : o)
          })
          get().recalculateOrderTotal(orderId)
        }
      },

      updateOrderShipping: (orderId, shippingOptionId, shippingOptionName, performedBy = 'system') => {
        const { orders } = get()
        const order = orders.find(o => o.id === orderId)
        if (!order) return
        
        const changes: Array<{ field: string; oldValue: any; newValue: any }> = []
        if (shippingOptionId !== order.shippingOptionId) {
          changes.push({ field: 'shippingOptionId', oldValue: order.shippingOptionId, newValue: shippingOptionId })
        }
        if (shippingOptionName && shippingOptionName !== order.shippingOptionName) {
          changes.push({ field: 'shippingOptionName', oldValue: order.shippingOptionName, newValue: shippingOptionName })
        }
        
        if (changes.length > 0) {
          const auditEntry = {
            id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            action: 'shipping_updated' as const,
            performedBy,
            changes,
            description: `Shipping option updated`
          }
          
          set({
            orders: orders.map(o => o.id === orderId ? {
              ...o,
              shippingOptionId,
              shippingOptionName: shippingOptionName || o.shippingOptionName,
              auditLog: [...(o.auditLog || []), auditEntry]
            } : o)
          })
          get().recalculateOrderTotal(orderId)
        }
      },

      recalculateOrderTotal: (orderId) => {
        const { orders } = get()
        const order = orders.find(o => o.id === orderId)
        if (!order) return
        
        const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        const totalDiscount = (order.vipDiscount || 0) + (order.promoDiscount || 0)
        const total = subtotal + order.shippingPrice + (order.paymentFee || 0) - totalDiscount
        
        set({
          orders: orders.map(o => o.id === orderId ? {
            ...o,
            subtotal,
            discount: totalDiscount,
            total
          } : o)
        })
      },

      // 주문 메모 관리
      addOrderNote: (orderId, content, createdBy) => {
        const { orders } = get()
        const note = {
          id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content,
          createdAt: new Date().toISOString(),
          createdBy
        }
        
        const auditEntry = {
          id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'note_added' as const,
          performedBy: createdBy,
          description: `Note added: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`
        }
        
        set({
          orders: orders.map(o => o.id === orderId ? {
            ...o,
            adminNotes: [...(o.adminNotes || []), note],
            auditLog: [...(o.auditLog || []), auditEntry]
          } : o)
        })
      },

      updateOrderNote: (orderId, noteId, content, updatedBy) => {
        const { orders } = get()
        const order = orders.find(o => o.id === orderId)
        if (!order) return
        
        const note = order.adminNotes?.find(n => n.id === noteId)
        if (!note) return
        
        const auditEntry = {
          id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'note_updated' as const,
          performedBy: updatedBy,
          changes: [{
            field: 'note.content',
            oldValue: note.content,
            newValue: content
          }],
          description: `Note updated`
        }
        
        set({
          orders: orders.map(o => o.id === orderId ? {
            ...o,
            adminNotes: (o.adminNotes || []).map(n => n.id === noteId ? {
              ...n,
              content,
              updatedAt: new Date().toISOString(),
              updatedBy
            } : n),
            auditLog: [...(o.auditLog || []), auditEntry]
          } : o)
        })
      },

      deleteOrderNote: (orderId, noteId, deletedBy) => {
        const { orders } = get()
        const order = orders.find(o => o.id === orderId)
        if (!order) return
        
        const note = order.adminNotes?.find(n => n.id === noteId)
        if (!note) return
        
        const auditEntry = {
          id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'note_deleted' as const,
          performedBy: deletedBy,
          description: `Note deleted: ${note.content.substring(0, 50)}${note.content.length > 50 ? '...' : ''}`
        }
        
        set({
          orders: orders.map(o => o.id === orderId ? {
            ...o,
            adminNotes: (o.adminNotes || []).filter(n => n.id !== noteId),
            auditLog: [...(o.auditLog || []), auditEntry]
          } : o)
        })
      },

      // 배송 추적 관련 메서드
      updateOrderTracking: (orderId, trackingInfo) => {
        const { orders } = get()
        set({
          orders: orders.map(o => o.id === orderId ? { ...o, tracking: trackingInfo } : o)
        })
      },

      addTrackingNumber: (orderId, trackingNumber, provider) => {
        const { orders } = get()
        const order = orders.find(o => o.id === orderId)
        if (order) {
          const trackingInfo = {
            number: trackingNumber,
            provider,
            status: 'pending' as const,
            estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            lastUpdate: new Date().toISOString(),
            history: [{
              timestamp: new Date().toISOString(),
              status: 'pending',
              location: 'Warehouse',
              description: 'Tracking number added'
            }]
          }
          set({
            orders: orders.map(o => o.id === orderId ? { ...o, tracking: trackingInfo } : o)
          })
        }
      },

      updateDeliveryStatus: (orderId, status, location, description) => {
        const { orders } = get()
        const order = orders.find(o => o.id === orderId)
        if (order && order.tracking) {
          const newHistory = {
            timestamp: new Date().toISOString(),
            status,
            location,
            description
          }
          const updatedTracking = {
            ...order.tracking,
            status,
            currentLocation: location,
            lastUpdate: new Date().toISOString(),
            history: [...order.tracking.history, newHistory]
          }
          if (status === 'delivered') {
            updatedTracking.actualDelivery = new Date().toISOString()
          }
          set({
            orders: orders.map(o => o.id === orderId ? { ...o, tracking: updatedTracking } : o)
          })
        }
      },

      // 템플릿 placeholder 치환 함수
      replaceTemplatePlaceholders: (text: string, variables: Record<string, string | number>): string => {
        let result = text
        Object.entries(variables).forEach(([key, value]) => {
          // {key} 형식 지원
          result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
          // {{key}} 형식 지원 (기존 emailService와 호환)
          result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
        })
        return result
      },

      // 이메일 본문 생성 함수 (템플릿 + 주문 데이터)
      generateEmailContent: (template: any, order: OrderRecord, companyName: string): string => {
        if (template?.type === 'order_confirmation') {
          return buildOrderConfirmationEmailPlainText(order)
        }

        const brandName = getCompanyBrandName(companyName)
        const variables = {
          orderId: order.id,
          customerName: order.customer.name || order.customer.email.split('@')[0] || 'Customer',
          companyName: brandName,
          companyNameLegal: companyName,
          orderDate: new Date(order.createdAtIso).toLocaleDateString('en-AU', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          }),
          orderTotal: `$${order.total.toFixed(2)}`,
          orderStatus: order.status,
          itemCount: order.items.length,
          shippingAddress: order.address.asSingleLine || 'N/A',
          paymentMethod: order.paymentMethod || 'N/A'
        }

        let content = ''
        
        // Greeting
        if (template.email.greeting) {
          content += get().replaceTemplatePlaceholders(template.email.greeting, variables) + '\n\n'
        }

        // Custom Message
        if (template.email.customMessage) {
          content += get().replaceTemplatePlaceholders(template.email.customMessage, variables) + '\n\n'
        }

        // Template-specific content
        // Closing
        if (template.email.closing) {
          content += get().replaceTemplatePlaceholders(template.email.closing, variables) + '\n'
        }

        // Shipping Notification 템플릿 특화 내용
        if (template.type === 'shipping_notification') {
          if (order.tracking) {
            if (template.content.showTrackingInfo) {
              content += `Tracking Information:\n`
              if (order.tracking.number) {
                content += `Tracking Number: ${order.tracking.number}\n`
              }
              if (order.tracking.provider) {
                content += `Shipping Provider: ${order.tracking.provider}\n`
              }
              if (order.tracking.status) {
                content += `Status: ${order.tracking.status}\n`
              }
              content += '\n'
            }

            if (template.content.showEstimatedDelivery && order.tracking.estimatedDelivery) {
              const estimatedDate = new Date(order.tracking.estimatedDelivery).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })
              content += `Expected Delivery: ${estimatedDate}\n\n`
            }

            if (order.tracking.currentLocation) {
              content += `Current Location: ${order.tracking.currentLocation}\n\n`
            }
          }

          if (template.content.customMessage) {
            content += get().replaceTemplatePlaceholders(template.content.customMessage, variables) + '\n\n'
          }
        }

        return content.trim()
      },

      // 이메일 확인 관련 메서드
      sendOrderConfirmationEmail: async (orderId) => {
        const { orders } = get()
        const order = orders.find(o => o.id === orderId)
        if (!order) {
          console.error('Order not found for email confirmation:', orderId)
          return false
        }

        const isAdminSession =
          typeof window !== 'undefined' &&
          (await import('./adminAuth')).useAdminAuth.getState().isLoggedIn

        /** Customer / guest: server actions (no open Resend API). */
        if (!isAdminSession) {
          try {
            let ok = false
            if (order.stripeCheckoutSessionId) {
              const { sendStripeCheckoutEmailsAction } = await import('@/app/actions/emails')
              const r = await sendStripeCheckoutEmailsAction(order.stripeCheckoutSessionId)
              ok = r.ok
            } else {
              const { sendGuestCheckoutEmailsAction } = await import('@/app/actions/emails')
              const r = await sendGuestCheckoutEmailsAction(JSON.stringify(order))
              ok = r.ok
            }
            if (ok) {
              set({
                orders: get().orders.map((o) =>
                  o.id === orderId
                    ? {
                        ...o,
                        emailConfirmation: {
                          sent: true,
                          sentAt: new Date().toISOString(),
                          status: 'sent',
                          attempts: 1,
                          lastAttempt: new Date().toISOString(),
                        },
                      }
                    : o
                ),
              })
              return true
            }
            throw new Error('Send failed')
          } catch (error) {
            console.error('Failed to send order confirmation email:', error)
            set({
              orders: get().orders.map((o) =>
                o.id === orderId
                  ? {
                      ...o,
                      emailConfirmation: {
                        sent: false,
                        status: 'failed',
                        attempts: 1,
                        lastAttempt: new Date().toISOString(),
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                      },
                    }
                  : o
              ),
            })
            return false
          }
        }

        try {
          // 템플릿 스토어에서 Order Confirmation 템플릿 가져오기
          const templateStore = useDocumentTemplateStore.getState()
          const template = templateStore.getTemplate('order_confirmation')
          
          if (!template) {
            console.error('Order confirmation template not found')
            return false
          }

          // Company 정보 가져오기 (Invoice Store에서)
          const { defaultTemplate } = await import('./invoiceStore').then(m => m.useInvoiceStore.getState())
          const companyName = defaultTemplate?.company?.name || COMPANY_LEGAL.companyName
          const brandName = getCompanyBrandName(companyName)

          // Order confirmation: fixed English subject + HTML body (see lib/orderConfirmationEmail.ts)
          const emailContent = buildOrderConfirmationEmailPlainText(order)
          const emailHtml = buildOrderConfirmationEmailHtml(order)
          const emailSubject = buildOrderConfirmationEmailSubject(order.id)

          // 이메일 발송
          const { emailService } = await import('./emailService')
          const attachments: File[] = []

          try {
            const OrderConfirmationTemplate = (await import('@/components/OrderConfirmationTemplate')).default
            const company = defaultTemplate?.company
            const React = (await import('react')).default

            const pdfOrder = {
              id: order.id,
              customer: {
                name: order.customer.name || order.customer.email.split('@')[0] || 'Customer',
                firstName: (order.customer as any).firstName,
                lastName: (order.customer as any).lastName,
                email: order.customer.email || '',
                phone: order.customer.phone || ''
              },
              items: order.items.map((it: any) => ({
                product: {
                  name: it.name,
                  price: it.price,
                  image: it.image || '/placeholder-product.jpg'
                },
                quantity: it.quantity,
                customizations: it.customizations || {}
              })),
              subtotal: order.subtotal,
              shipping: order.shippingPrice,
              total: order.total,
              discount: order.discount || 0,
              createdAtIso: order.createdAtIso,
              paymentMethod: order.paymentMethod
            }

            const templateProps = {
              greeting: template.email.greeting,
              customMessage: template.content?.customMessage,
              closing: template.email.closing
            }

            if (typeof window !== 'undefined') {
              const { renderReactPreviewToPdfFile } = await import('@/lib/previewPdf')
              const pdfFile = await renderReactPreviewToPdfFile({
                reactElement: React.createElement(OrderConfirmationTemplate as any, {
                  order: pdfOrder,
                  company,
                  template: templateProps
                }),
                filename: `Order-Confirmation-${order.id}.pdf`
              })
              if (pdfFile) attachments.push(pdfFile)
            }
          } catch (e) {
            console.warn('Failed to generate Order Confirmation PDF attachment:', e)
          }
          const result = await emailService.sendResponse({
            customerEmail: order.customer.email || '',
            customerName: order.customer.name || order.customer.email.split('@')[0] || 'Customer',
            subject: emailSubject,
            message: emailContent,
            html: emailHtml,
            adminName: brandName,
            attachments
          })

          if (result.success) {
            // Update email confirmation status
            set({
              orders: orders.map(o => o.id === orderId ? { 
                ...o, 
                emailConfirmation: { 
                  sent: true,
                  sentAt: new Date().toISOString(),
                  status: 'sent',
                  attempts: 1,
                  lastAttempt: new Date().toISOString()
                } 
              } : o)
            })
            
            console.log('Order confirmation email sent successfully:', orderId)
            return true
          } else {
            throw new Error(result.message || 'Failed to send email')
          }
        } catch (error) {
          console.error('Failed to send order confirmation email:', error)
          
          // Update email confirmation status to failed
          set({
            orders: orders.map(o => o.id === orderId ? { 
              ...o, 
              emailConfirmation: { 
                sent: false,
                status: 'failed',
                attempts: 1,
                lastAttempt: new Date().toISOString(),
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
              } 
            } : o)
          })
          
          return false
        }
      },

      resendOrderConfirmationEmail: async (orderId) => {
        const { orders } = get()
        const order = orders.find(o => o.id === orderId)
        if (!order) {
          console.error('Order not found for email confirmation:', orderId)
          return false
        }

        try {
          // 템플릿 스토어에서 Order Confirmation 템플릿 가져오기
          const templateStore = useDocumentTemplateStore.getState()
          const template = templateStore.getTemplate('order_confirmation')
          
          if (!template) {
            console.error('Order confirmation template not found')
            return false
          }

          // Company 정보 가져오기 (Invoice Store에서)
          const { defaultTemplate } = await import('./invoiceStore').then(m => m.useInvoiceStore.getState())
          const companyName = defaultTemplate?.company?.name || COMPANY_LEGAL.companyName

          const emailContent = buildOrderConfirmationEmailPlainText(order)
          const emailHtml = buildOrderConfirmationEmailHtml(order)
          const emailSubject = buildOrderConfirmationEmailSubject(order.id)

          // 이메일 발송
          const { emailService } = await import('./emailService')
          const result = await emailService.sendResponse({
            customerEmail: order.customer.email || '',
            customerName: order.customer.name || order.customer.email.split('@')[0] || 'Customer',
            subject: emailSubject,
            message: emailContent,
            html: emailHtml,
            adminName: companyName
          })

          if (result.success) {
            // Update email confirmation status
            const currentAttempts = order.emailConfirmation?.attempts || 0
            set({
              orders: orders.map(o => o.id === orderId ? { 
                ...o, 
                emailConfirmation: { 
                  sent: true,
                  sentAt: new Date().toISOString(),
                  status: 'sent',
                  attempts: currentAttempts + 1,
                  lastAttempt: new Date().toISOString()
                } 
              } : o)
            })
            
            console.log('Order confirmation email resent successfully:', orderId)
            return true
          } else {
            throw new Error(result.message || 'Failed to send email')
          }
        } catch (error) {
          console.error('Failed to resend order confirmation email:', error)
          
          // Update email confirmation status to failed
          const currentAttempts = order.emailConfirmation?.attempts || 0
          set({
            orders: orders.map(o => o.id === orderId ? { 
              ...o, 
              emailConfirmation: { 
                sent: false,
                status: 'failed',
                attempts: currentAttempts + 1,
                lastAttempt: new Date().toISOString(),
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
              } 
            } : o)
          })
          
          return false
        }
      },

      sendShippingNotificationEmail: async (orderId) => {
        const { orders } = get()
        const order = orders.find(o => o.id === orderId)
        if (!order) {
          console.error('Order not found for shipping notification:', orderId)
          return false
        }

        // 추적 정보가 없으면 발송하지 않음
        if (!order.tracking || !order.tracking.number) {
          console.log('Tracking information not available for shipping notification:', orderId)
          return false
        }

        // Auto-send path is server-only to avoid client-side blank PDF attachments.
        try {
          const { sendAdminShippingNotificationEmailAction } = await import('@/app/actions/emails')
          const serverResult = await sendAdminShippingNotificationEmailAction({
            orderId,
            orderJson: JSON.stringify(order),
          })
          if (serverResult.ok) {
            console.log('✅ Shipping notification email sent via server action:', orderId)
            return true
          }
          console.warn('[sendShippingNotificationEmail] server path failed:', serverResult.error)
          return false
        } catch (error) {
          console.error('❌ Failed to send shipping notification email:', error)
          return false
        }
      },

      sendReceiptEmail: async (orderId) => {
        const { orders } = get()
        const order = orders.find((o) => o.id === orderId)
        if (!order) {
          console.error('Order not found for receipt email:', orderId)
          return false
        }

        try {
          const { sendAdminOrderEmailAction } = await import('@/app/actions/emails')
          const ledger = await sendAdminOrderEmailAction({ orderId, kind: 'receipt' })
          if (ledger.ok) {
            const sentAt = new Date().toISOString()
            set((state) => ({
              orders: state.orders.map((o) =>
                o.id === orderId ? { ...o, receiptEmail: { sent: true, sentAt } } : o
              ),
            }))
            return true
          }
        } catch {
          /* fall through to legacy paths */
        }

        const isAdminSession =
          typeof window !== 'undefined' &&
          (await import('./adminAuth')).useAdminAuth.getState().isLoggedIn

        if (!isAdminSession) {
          try {
            const { sendCustomerReceiptEmailAction } = await import('@/app/actions/emails')
            const r = await sendCustomerReceiptEmailAction(JSON.stringify(order))
            if (r.ok) {
              const sentAt = new Date().toISOString()
              set((state) => ({
                orders: state.orders.map((o) =>
                  o.id === orderId ? { ...o, receiptEmail: { sent: true, sentAt } } : o
                ),
              }))
              return true
            }
            console.warn('[sendReceiptEmail] server receipt failed', r.error)
          } catch (e) {
            console.error('[sendReceiptEmail] customer server path', e)
          }
          return false
        }

        try {
          const templateStore = useDocumentTemplateStore.getState()
          const template = templateStore.getTemplate('receipt')
          if (!template) {
            console.error('Receipt template not found')
            return false
          }

          const { defaultTemplate } = await import('./invoiceStore').then((m) => m.useInvoiceStore.getState())
          const companyName = defaultTemplate?.company?.name || COMPANY_LEGAL.companyName
          const brandName = getCompanyBrandName(companyName)

          const emailContent = get().generateEmailContent(template, order, companyName)

          const subjectVariables = {
            orderId: order.id,
            customerName: order.customer.name || order.customer.email.split('@')[0] || 'Customer',
            companyName: brandName,
            companyNameLegal: companyName
          }
          const subjectTemplate = (template.email.subject || '').trim()
          const emailSubject = get().replaceTemplatePlaceholders(
            subjectTemplate || 'Receipt {orderId} from {companyName}',
            subjectVariables
          )

          const { emailService } = await import('./emailService')
          const attachments: File[] = []

          try {
            const OrderReceipt = (await import('@/components/OrderReceipt')).default
            const company = defaultTemplate?.company
            const React = (await import('react')).default

            const pdfOrder = {
              id: order.id,
              customer: {
                name: order.customer.name || order.customer.email.split('@')[0] || 'Customer',
                firstName: (order.customer as any).firstName,
                lastName: (order.customer as any).lastName,
                email: order.customer.email || '',
                phone: order.customer.phone || ''
              },
              address: {
                streetAddress: order.address.streetAddress,
                suburb: order.address.suburb,
                state: order.address.state,
                postcode: order.address.postcode,
                country: order.address.country
              },
              items: order.items.map((it: any) => ({
                product: {
                  name: it.name,
                  price: it.price,
                  image: it.image || '/placeholder-product.jpg'
                },
                quantity: it.quantity,
                customizations: it.customizations || {}
              })),
              subtotal: order.subtotal,
              shipping: order.shippingPrice,
              total: order.total,
              vipDiscount: (order as any).vipDiscount,
              promoDiscount: (order as any).promoDiscount,
              discount: order.discount,
              vipGradeName: (order as any).vipGradeName,
              vipGradeCode: (order as any).vipGradeCode,
              promoCode: (order as any).promoCode,
              paymentMethod: order.paymentMethod || 'N/A',
              shippingOption: {
                name: order.shippingOptionName || order.shippingOptionId || 'Shipping',
                price: order.shippingPrice
              },
              createdAtIso: order.createdAtIso
            }

            // OrderReceipt doesn't accept company props today; it reads COMPANY_LEGAL/CONTACT directly.
            void company

            if (typeof window !== 'undefined') {
              const { renderReactPreviewToPdfFile } = await import('@/lib/previewPdf')
              const pdfFile = await renderReactPreviewToPdfFile({
                reactElement: React.createElement(OrderReceipt as any, {
                  order: pdfOrder
                }),
                filename: `Receipt-${order.id}.pdf`
              })
              if (pdfFile) attachments.push(pdfFile)
            }
          } catch (e) {
            console.warn('Failed to generate Receipt PDF attachment:', e)
          }

          const result = await emailService.sendResponse({
            customerEmail: order.customer.email || '',
            customerName: order.customer.name || order.customer.email.split('@')[0] || 'Customer',
            subject: emailSubject,
            message: emailContent,
            adminName: brandName,
            attachments
          })

          if (result.success) {
            const sentAt = new Date().toISOString()
            set((state) => ({
              orders: state.orders.map((o) =>
                o.id === orderId ? { ...o, receiptEmail: { sent: true, sentAt } } : o
              )
            }))
            console.log('✅ Receipt email sent successfully:', orderId)
            return true
          }
          throw new Error(result.message || 'Failed to send receipt email')
        } catch (error) {
          console.error('❌ Failed to send receipt email:', error)
          return false
        }
      },

      updateEmailConfirmationStatus: (orderId, status, errorMessage) => {
        const { orders } = get()
        set({
          orders: orders.map(o => o.id === orderId ? { 
            ...o, 
            emailConfirmation: { 
              sent: status === 'sent' || status === 'delivered',
              sentAt: status === 'sent' || status === 'delivered' ? new Date().toISOString() : o.emailConfirmation?.sentAt,
              status,
              attempts: (o.emailConfirmation?.attempts || 0) + 1,
              lastAttempt: new Date().toISOString(),
              errorMessage
            } 
          } : o)
        })
      },

      // 커스터마이징 관련 메서드
      updateCustomization: (productId, customization) => {
        const { customizations } = get()
        set({
          customizations: {
            ...customizations,
            [productId]: customization
          }
        })
      },

      // UI 상태 메서드
      setIsCustomizationModalOpen: (open) => {
        set({ isCustomizationModalOpen: open })
      },

      // English-only storefront: keep signature for compatibility but always use English
      setLanguage: (_language) => {
        set({ language: 'en' })
      },

      // 포맷 설정 초기값 (AU 기본값)
      currency: 'AUD' as Currency,
      dateFormat: 'DD/MM/YYYY' as DateFormat,
      timezone: 'Australia/Brisbane' as Timezone,

      // 포맷 설정 메서드
      setCurrency: (currency) => {
        set({ currency })
        console.log('💰 Currency set to:', currency)
      },
      setDateFormat: (format) => {
        set({ dateFormat: format })
        console.log('📅 Date format set to:', format)
      },
      setTimezone: (timezone) => {
        set({ timezone })
        console.log('🌍 Timezone set to:', timezone)
      },

      // UI 설정 초기값
      defaultPageSize: 25,
      theme: 'light' as 'light' | 'dark' | 'auto',
      autoRefreshInterval: 0, // 기본값: Off

      // UI 설정 메서드
      setDefaultPageSize: (size) => {
        set({ defaultPageSize: size })
        console.log('📄 Default page size set to:', size)
      },
      setTheme: (theme) => {
        set({ theme })
        console.log('🎨 Theme set to:', theme)
        // 테마 즉시 적용
        if (typeof window !== 'undefined') {
          const root = document.documentElement
          if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            root.classList.add('dark')
          } else {
            root.classList.remove('dark')
          }
        }
      },
      setAutoRefreshInterval: (interval) => {
        set({ autoRefreshInterval: interval })
        console.log('🔄 Auto refresh interval set to:', interval === 0 ? 'Off' : `${interval / 1000}s`)
      },

      // 상품 관리 메서드
      addProduct: (product) => {
        const { products } = get()
        // ✅ customizationOptions 및 image 명시적 보존 (updateProduct와 동일한 로직)
        const productWithCustomization = {
          ...product,
          image: product.image || '', // ✅ image 명시적 보존
          customizationOptions: Array.isArray(product.customizationOptions) 
            ? product.customizationOptions 
            : (product.customizationOptions || [])
        }
        const normalized = normalizeProductStock(productWithCustomization)
        // ✅ image가 normalizeProductStock에서 보존되는지 확인
        if ('image' in productWithCustomization) {
          normalized.image = productWithCustomization.image
        }
        // ✅ customizationOptions가 normalizeProductStock에서 보존되는지 확인
        if ('customizationOptions' in productWithCustomization) {
          normalized.customizationOptions = productWithCustomization.customizationOptions
        }
        const sanitized = sanitizeProduct(normalized)
        // ✅ image가 sanitizeProduct에서 보존되는지 확인
        if ('image' in normalized) {
          sanitized.image = normalized.image
        }
        // ✅ customizationOptions가 sanitizeProduct에서 보존되는지 확인
        if ('customizationOptions' in normalized) {
          sanitized.customizationOptions = normalized.customizationOptions
        }
        if ('stickerSheetQuantity' in product && typeof (product as any).stickerSheetQuantity === 'number') {
          sanitized.stickerSheetQuantity = (product as any).stickerSheetQuantity
        }
        
        // ✅ 디버깅: 저장된 상품 데이터 확인 (개발 환경에서만)
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [addProduct] Saved product:', {
            productId: sanitized.id,
            productName: sanitized.name,
            image: sanitized.image,
            imageType: typeof sanitized.image,
            imageLength: sanitized.image?.length || 0,
            hasCustomizationOptions: !!sanitized.customizationOptions,
            customizationOptionsLength: sanitized.customizationOptions?.length || 0
          })
        }
        // 제품 목록 크기 제한: 오래된 제품 제거
        const updatedProducts = [...products, sanitized]
        const limitedProducts = updatedProducts.length > MAX_STORED_PRODUCTS
          ? updatedProducts.slice(-MAX_STORED_PRODUCTS) // 최신 제품만 유지
          : updatedProducts
        set({ products: limitedProducts })
        
        // 🆕 상품 추가 이벤트 디스패치 (홈페이지 즉시 반영)
        if (typeof window !== 'undefined') {
          // ✅ 디버깅: 이벤트 디스패치 전 확인
          if (process.env.NODE_ENV === 'development') {
            console.log('📢 [addProduct] Dispatching products-store-updated event:', {
              productId: sanitized.id,
              productName: sanitized.name,
              image: sanitized.image,
              action: 'add',
              totalProducts: limitedProducts.length
            })
          }
          
          // Custom Event 디스패치
          window.dispatchEvent(new CustomEvent('products-store-updated', { 
            detail: { productId: sanitized.id, action: 'add', products: limitedProducts } 
          }))
          
          // localStorage 직접 업데이트 (다른 탭/페이지에서 변경 감지)
          try {
            const currentStore = localStorage.getItem('selpic-store')
            if (currentStore) {
              const parsed = JSON.parse(currentStore)
              parsed.state.products = limitedProducts
              localStorage.setItem('selpic-store', JSON.stringify(parsed))
              
              // ✅ 디버깅: localStorage 업데이트 확인
              if (process.env.NODE_ENV === 'development') {
                console.log('💾 [addProduct] localStorage updated:', {
                  productId: sanitized.id,
                  image: sanitized.image,
                  totalProducts: limitedProducts.length
                })
              }
            }
          } catch (error) {
            console.error('❌ [addProduct] Failed to update localStorage:', error)
          }
          scheduleCatalogSyncToServer(limitedProducts)
        }
      },

      updateProduct: (product) => {
        const { products } = get()
        const existing = products.find(p => p.id === product.id)
        if (!existing) {
          console.warn('Product not found for update:', product.id)
          return
        }
        const merged = {
          ...existing,
          ...product
        }
        // ✅ customizationOptions 명시적 보존 (product에 있으면 사용, 없으면 기존 값 유지)
        if ('customizationOptions' in product) {
          // product에 customizationOptions가 명시적으로 있으면 사용
          merged.customizationOptions = product.customizationOptions
        } else {
          // product에 customizationOptions가 없으면 기존 값 유지
          merged.customizationOptions = existing.customizationOptions
        }
        // inStock이 명시적으로 설정된 경우 보존
        const hasExplicitInStock = 'inStock' in product
        const normalized = normalizeProductStock(merged)
        // 명시적으로 inStock이 설정된 경우, normalizeProductStock의 자동 계산을 무시
        if (hasExplicitInStock) {
          normalized.inStock = product.inStock
        }
        // ✅ customizationOptions가 normalizeProductStock에서 보존되는지 확인
        if ('customizationOptions' in merged) {
          normalized.customizationOptions = merged.customizationOptions
        }
        const sanitized = sanitizeProduct(normalized)
        // ✅ customizationOptions가 sanitizeProduct에서 보존되는지 확인
        if ('customizationOptions' in normalized) {
          sanitized.customizationOptions = normalized.customizationOptions
        }
        if ('stickerSheetQuantity' in product && typeof (product as any).stickerSheetQuantity === 'number') {
          sanitized.stickerSheetQuantity = (product as any).stickerSheetQuantity
        } else if (typeof (existing as any).stickerSheetQuantity === 'number') {
          sanitized.stickerSheetQuantity = (existing as any).stickerSheetQuantity
        }
        // rating, reviews 명시적 보존 (Edit Product에서 변경 시 반영)
        if ('rating' in product && typeof (product as any).rating === 'number') {
          sanitized.rating = (product as any).rating
        } else if (typeof (existing as any).rating === 'number') {
          sanitized.rating = (existing as any).rating
        }
        if ('reviews' in product && typeof (product as any).reviews === 'number') {
          sanitized.reviews = (product as any).reviews
        } else if (typeof (existing as any).reviews === 'number') {
          sanitized.reviews = (existing as any).reviews
        }
        set({
          products: products.map(p => p.id === product.id ? sanitized : p)
        })
        
        // 🆕 상품 업데이트 이벤트 디스패치 (홈페이지 즉시 반영)
        if (typeof window !== 'undefined') {
          const updatedProducts = products.map(p => p.id === product.id ? sanitized : p)
          // Custom Event 디스패치
          window.dispatchEvent(new CustomEvent('products-store-updated', { 
            detail: { productId: product.id, action: 'update', products: updatedProducts } 
          }))
          // localStorage 직접 업데이트 (다른 탭/페이지에서 변경 감지)
          try {
            const currentStore = localStorage.getItem('selpic-store')
            if (currentStore) {
              const parsed = JSON.parse(currentStore)
              parsed.state.products = updatedProducts
              localStorage.setItem('selpic-store', JSON.stringify(parsed))
            }
          } catch (error) {
            console.error('Failed to update localStorage:', error)
          }
          scheduleCatalogSyncToServer(updatedProducts)
        }
      },

      deleteProduct: (productId) => {
        const { products } = get()
        const updatedProducts = products.filter(p => p.id !== productId)
        
        // ✅ persist 미들웨어가 자동으로 localStorage를 업데이트하도록 set() 호출
        set({
          products: updatedProducts
        })
        
        // 🆕 상품 삭제 이벤트 디스패치 (홈페이지 즉시 반영)
        if (typeof window !== 'undefined') {
          // Custom Event 디스패치 (다른 탭/페이지에서 변경 감지)
          window.dispatchEvent(new CustomEvent('products-store-updated', { 
            detail: { productId: productId, action: 'delete', products: updatedProducts } 
          }))
          
          // ✅ persist 미들웨어가 localStorage를 업데이트한 후 확인
          // 약간의 지연을 두어 persist 미들웨어가 localStorage를 업데이트할 시간을 줌
          setTimeout(() => {
            try {
              const currentStore = localStorage.getItem('selpic-store')
              if (currentStore) {
                const parsed = JSON.parse(currentStore)
                const storedProductIds = parsed?.state?.products?.map((p: any) => p.id) || []
                const deletedStillExists = storedProductIds.includes(productId)
                
                if (deletedStillExists) {
                  // persist 미들웨어가 업데이트하지 않았다면 수동으로 업데이트
                  console.warn('⚠️ [Store] Deleted product still in localStorage, manually updating...')
                  parsed.state.products = updatedProducts
                  localStorage.setItem('selpic-store', JSON.stringify(parsed))
                } else {
                  console.log('✅ [Store] Product deleted successfully from localStorage')
                }
              }
            } catch (error) {
              console.error('❌ [Store] Failed to verify localStorage update:', error)
            }
          }, 100)
          scheduleCatalogSyncToServer(updatedProducts)
        }
      },
      refreshProducts: () => {
        // ✅ localStorage에서 최신 products 가져오기 (Zustand persist는 .state 래퍼 없이 저장할 수 있음)
        if (typeof window !== 'undefined') {
          try {
            const currentStore = localStorage.getItem('selpic-store')
            if (currentStore) {
              const parsed = JSON.parse(currentStore) as { state?: { products?: unknown[] }; products?: unknown[] }
              const stored = parsed?.state?.products ?? parsed?.products
              if (stored && Array.isArray(stored)) {
                set({
                  products: stored as any
                })
                console.log('🔄 [Store] Products refreshed from localStorage:', stored.length, '개 상품')
                return
              }
            }
            // localStorage에 products가 없을 때만 빈 배열로 설정 (기존 메모리 상품을 덮어쓰지 않도록, 없을 때만)
            const { products } = get()
            if (products.length === 0) {
              console.log('🔄 [Store] No products in localStorage, keeping empty')
            } else {
              console.log('🔄 [Store] No products in localStorage, keeping current in-memory products:', products.length, '개')
            }
          } catch (error) {
            console.error('❌ [Store] Failed to refresh products from localStorage:', error)
            const { products } = get()
            console.log('🔄 [Store] Using current products:', products.length, '개 상품')
          }
        } else {
          const { products } = get()
          console.log('🔄 [Store] SSR environment, using current products:', products.length, '개 상품')
        }
      },

      adjustProductStock: (productId, delta, reason, source = 'manual') => {
        const { products, stockMovements } = get()
        const index = products.findIndex(p => p.id === productId)
        if (index === -1) {
          console.warn('Attempted to adjust stock for unknown product:', productId)
          return
        }

        const product = products[index]
        const currentStock = product.stockQuantity ?? 0
        const newStock = Math.max(0, currentStock + delta)

        const updatedProduct = normalizeProductStock({
          ...product,
          stockQuantity: newStock,
          inStock: newStock > 0
        })

        const updatedProducts = [...products]
        updatedProducts[index] = updatedProduct

        const movement: StockMovement = {
          id: generateStockMovementId(),
          productId,
          type: delta >= 0 ? 'in' : 'out',
          quantity: Math.abs(delta),
          reason,
          source: source ?? (delta >= 0 ? 'restock' : 'order'),
          createdAt: new Date().toISOString(),
          resultingStock: newStock
        }

        set({
          products: updatedProducts,
          stockMovements: [movement, ...stockMovements].slice(0, MAX_STOCK_HISTORY)
        })

        if (typeof window !== 'undefined') {
          scheduleCatalogSyncToServer(updatedProducts)
        }
      },

      recordStockMovement: (movement) => {
        const { stockMovements } = get()
        const entry: StockMovement = {
          ...movement,
          id: generateStockMovementId(),
          createdAt: new Date().toISOString()
        }
        set({
          stockMovements: [entry, ...stockMovements].slice(0, MAX_STOCK_HISTORY)
        })
      },

      // 사용자 관련 메서드
      setUser: (user) => {
        set({ user })
      },
      
      // Newsletter 구독자 관련 메서드
      newsletterSubscribers: [] as NewsletterSubscriber[],
      
      subscribeToNewsletter: (email) => {
        const { newsletterSubscribers } = get()
        
        // 이미 구독 중인지 확인
        const existing = newsletterSubscribers.find(sub => sub.email.toLowerCase() === email.toLowerCase())
        if (existing) {
          // 이미 구독 중이지만 비활성화된 경우 다시 활성화
          if (!existing.isActive) {
            set({
              newsletterSubscribers: newsletterSubscribers.map(sub =>
                sub.id === existing.id
                  ? { ...sub, isActive: true, subscribedAt: new Date().toISOString(), unsubscribedAt: undefined }
                  : sub
              )
            })
            return true
          }
          // 이미 활성 구독 중
          return false
        }
        
        // 새 구독자 추가
        const newSubscriber: NewsletterSubscriber = {
          id: `sub-${Date.now()}`,
          email: email.toLowerCase(),
          subscribedAt: new Date().toISOString(),
          isActive: true
        }
        set({
          newsletterSubscribers: [...newsletterSubscribers, newSubscriber]
        })
        return true
      },
      
      unsubscribeFromNewsletter: (email) => {
        const { newsletterSubscribers } = get()
        const normalizedEmail = email.toLowerCase()
        
        // 구독자가 있는지 확인
        const existingSubscriber = newsletterSubscribers.find(
          sub => sub.email.toLowerCase() === normalizedEmail
        )
        
        if (!existingSubscriber) {
          // 구독자가 없으면 새로 추가하되 비활성 상태로 설정 (이력 추적을 위해)
          const newSubscriber: NewsletterSubscriber = {
            id: `sub-${Date.now()}`,
            email: normalizedEmail,
            subscribedAt: new Date().toISOString(),
            isActive: false,
            unsubscribedAt: new Date().toISOString()
          }
          set({
            newsletterSubscribers: [...newsletterSubscribers, newSubscriber]
          })
          return true
        }
        
        // 구독자가 있으면 비활성화
        set({
          newsletterSubscribers: newsletterSubscribers.map(sub =>
            sub.email.toLowerCase() === normalizedEmail
              ? { ...sub, isActive: false, unsubscribedAt: new Date().toISOString() }
              : sub
          )
        })
        return true
      },
      
      deleteNewsletterSubscriber: (id) => {
        const { newsletterSubscribers } = get()
        set({
          newsletterSubscribers: newsletterSubscribers.filter(sub => sub.id !== id)
        })
      },
      
      getActiveNewsletterSubscribers: () => {
        const { newsletterSubscribers } = get()
        return newsletterSubscribers.filter(sub => sub.isActive)
      },
      
      // Newsletter 발송 이력 관련 메서드
      newsletterCampaigns: [] as NewsletterCampaign[],
      
      sendNewsletterCampaign: async (campaign) => {
        const { newsletterSubscribers, newsletterCampaigns } = get()
        
        // 발송 대상 구독자 결정
        let targetSubscribers = newsletterSubscribers.filter(sub => sub.isActive)
        
        // 특정 구독자 ID가 지정된 경우 해당 구독자만 선택
        if (campaign.recipientIds && campaign.recipientIds.length > 0) {
          targetSubscribers = targetSubscribers.filter(sub => 
            campaign.recipientIds!.includes(sub.id)
          )
        }
        
        if (targetSubscribers.length === 0) {
          console.warn('No active subscribers to send newsletter to')
          return false
        }
        
        try {
          // 수신자 이메일 주소 배열
          const recipientEmails = targetSubscribers.map(sub => sub.email)
          
          // 기본 URL (서버 사이드에서는 환경 변수 사용)
          const baseUrl = typeof window !== 'undefined' 
            ? window.location.origin 
            : (process.env.NEXT_PUBLIC_BASE_URL || 'http://192.168.1.104:3005')
          
          // 각 수신자별로 개인화된 HTML 이메일 생성
          const generatePersonalizedEmail = (recipientEmail: string) => {
            const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(recipientEmail)}`
            
            return `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>${campaign.subject}</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                    <h1 style="color: #2563eb; margin-top: 0;">${campaign.subject}</h1>
                    <div style="white-space: pre-wrap; margin-top: 20px;">${campaign.message.replace(/\n/g, '<br>')}</div>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                      This email was sent to you because you subscribed to Selpic newsletter.<br>
                      <a href="${unsubscribeUrl}" style="color: #2563eb; text-decoration: underline;">Unsubscribe</a>
                    </p>
                  </div>
                </body>
              </html>
            `
          }
          
          // Server action: requires Supabase admin session (no open /api/newsletter/send relay).
          const { sendAdminComposeEmailAction } = await import('@/app/actions/emails')
          let successCount = 0
          let failedCount = 0
          const errors: string[] = []

          for (const recipientEmail of recipientEmails) {
            try {
              const htmlContent = generatePersonalizedEmail(recipientEmail)
              const sendResult = await sendAdminComposeEmailAction({
                to: recipientEmail,
                subject: campaign.subject,
                html: htmlContent,
              })
              if (sendResult.ok) {
                successCount++
              } else {
                failedCount++
                errors.push(`${recipientEmail}: ${sendResult.error || 'Send failed'}`)
              }
            } catch (error: any) {
              failedCount++
              errors.push(`${recipientEmail}: ${error.message || 'Network error'}`)
            }
          }
          
          // 발송 결과 결정
          let status: 'sent' | 'failed' | 'pending' = 'sent'
          if (failedCount > 0 && successCount === 0) {
            status = 'failed'
            console.error(`Failed to send newsletter to all recipients. Errors:`, errors)
          } else if (failedCount > 0) {
            status = 'sent' // 일부 성공도 'sent'로 표시
            console.warn(`Newsletter sent with some failures: ${successCount} success, ${failedCount} failed`)
            if (errors.length > 0) {
              console.error('Failed recipients:', errors)
            }
          } else {
            console.log(`Newsletter sent successfully to ${successCount} recipients`)
          }
          
          // Persist campaign to Supabase (admin API) when running in the browser
          let persistedId: string | undefined
          if (typeof window !== 'undefined') {
            try {
              const res = await fetch('/api/admin/newsletter/campaigns', {
                method: 'POST',
                credentials: 'include',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  subject: campaign.subject,
                  message: campaign.message,
                  type: campaign.type,
                  sent_by: campaign.sentBy,
                  recipient_count: targetSubscribers.length,
                  success_count: successCount,
                  failed_count: failedCount,
                  status,
                  recipient_ids: campaign.recipientIds ?? null,
                }),
              })
              const j = (await res.json().catch(() => null)) as { ok?: boolean; id?: string }
              if (res.ok && j?.ok && j?.id) {
                persistedId = String(j.id)
              }
            } catch {
              // non-fatal: keep local history only
            }
          }

          const newCampaign: NewsletterCampaign = {
            ...campaign,
            id: persistedId || `campaign-${Date.now()}`,
            sentAt: new Date().toISOString(),
            status: status,
            recipientCount: targetSubscribers.length,
            recipientIds: campaign.recipientIds,
            successCount,
            failedCount
          }
          
          set({
            newsletterCampaigns: [newCampaign, ...newsletterCampaigns]
          })
          
          return status === 'sent'
        } catch (error) {
          console.error('Failed to send newsletter campaign:', error)
          
          let failedPersistedId: string | undefined
          if (typeof window !== 'undefined') {
            try {
              const res = await fetch('/api/admin/newsletter/campaigns', {
                method: 'POST',
                credentials: 'include',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  subject: campaign.subject,
                  message: campaign.message,
                  type: campaign.type,
                  sent_by: campaign.sentBy,
                  recipient_count: targetSubscribers.length,
                  success_count: 0,
                  failed_count: targetSubscribers.length,
                  status: 'failed',
                  recipient_ids: campaign.recipientIds ?? null,
                }),
              })
              const j = (await res.json().catch(() => null)) as { ok?: boolean; id?: string }
              if (res.ok && j?.ok && j?.id) failedPersistedId = String(j.id)
            } catch {
              /* ignore */
            }
          }

          const failedCampaign: NewsletterCampaign = {
            ...campaign,
            id: failedPersistedId || `campaign-${Date.now()}`,
            sentAt: new Date().toISOString(),
            status: 'failed',
            recipientCount: targetSubscribers.length,
            recipientIds: campaign.recipientIds,
            successCount: 0,
            failedCount: targetSubscribers.length
          }
          
          set({
            newsletterCampaigns: [failedCampaign, ...newsletterCampaigns]
          })
          
          return false
        }
      },
      
      getNewsletterCampaigns: () => {
        const { newsletterCampaigns } = get()
        return newsletterCampaigns.sort((a, b) => 
          new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
        )
      },
      
      deleteNewsletterCampaign: (id) => {
        const { newsletterCampaigns } = get()
        set({
          newsletterCampaigns: newsletterCampaigns.filter(campaign => campaign.id !== id)
        })
      },
      
      // Newsletter 템플릿 관련 메서드
      newsletterTemplates: [
        {
          id: 'template-promo-1',
          name: 'Special Promotion',
          subject: 'Special Offer - Limited Time Only!',
          message: `Dear Valued Customer,

We're excited to offer you a special promotion!

🎉 [PROMOTION DETAILS]

This offer is valid for a limited time only. Don't miss out on this amazing opportunity!

Shop now and save!

Best regards,
Selpic Team`,
          type: 'promotion',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDefault: true
        },
        {
          id: 'template-announcement-1',
          name: 'New Product Announcement',
          subject: 'Exciting News: New Products Available!',
          message: `Dear Customer,

We're thrilled to announce our latest product collection!

✨ [PRODUCT ANNOUNCEMENT DETAILS]

Check out our new products and discover something special.

Thank you for being part of the Selpic family!

Best regards,
Selpic Team`,
          type: 'announcement',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDefault: true
        },
        {
          id: 'template-event-1',
          name: 'Event Invitation',
          subject: 'You\'re Invited: Special Event',
          message: `Dear Customer,

You're invited to join us for a special event!

📅 [EVENT DETAILS]

We'd love to see you there!

Best regards,
Selpic Team`,
          type: 'event',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDefault: true
        },
        {
          id: 'template-newsletter-1',
          name: 'Monthly Newsletter',
          subject: 'Selpic Monthly Newsletter',
          message: `Dear Subscriber,

Welcome to our monthly newsletter!

📰 [NEWSLETTER CONTENT]

Stay tuned for more updates and special offers!

Best regards,
Selpic Team`,
          type: 'newsletter',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDefault: true
        },
        {
          id: 'template-general-1',
          name: 'General Update',
          subject: 'Update from Selpic',
          message: `Dear Customer,

We wanted to share an important update with you.

📢 [UPDATE CONTENT]

Thank you for your continued support!

Best regards,
Selpic Team`,
          type: 'general',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDefault: true
        }
      ] as NewsletterTemplate[],
      
      saveNewsletterTemplate: (template) => {
        const { newsletterTemplates } = get()
        const newTemplate: NewsletterTemplate = {
          ...template,
          id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDefault: false
        }
        set({
          newsletterTemplates: [...newsletterTemplates, newTemplate]
        })
        return newTemplate.id
      },
      
      updateNewsletterTemplate: (id, updates) => {
        const { newsletterTemplates } = get()
        set({
          newsletterTemplates: newsletterTemplates.map(template =>
            template.id === id
              ? { ...template, ...updates, updatedAt: new Date().toISOString() }
              : template
          )
        })
      },
      
      deleteNewsletterTemplate: (id) => {
        const { newsletterTemplates } = get()
        // 기본 템플릿은 삭제 불가
        const template = newsletterTemplates.find(t => t.id === id)
        if (template?.isDefault) {
          console.warn('Cannot delete default template')
          return
        }
        set({
          newsletterTemplates: newsletterTemplates.filter(template => template.id !== id)
        })
      },
      
      getNewsletterTemplate: (id) => {
        const { newsletterTemplates } = get()
        return newsletterTemplates.find(template => template.id === id)
      },
      
      getNewsletterTemplatesByType: (type) => {
        const { newsletterTemplates } = get()
        return newsletterTemplates.filter(template => template.type === type)
      }
    }),
    {
      name: 'selpic-store',
      partialize: (state) => ({
        products: state.products,
        cart: state.cart,
        customizations: state.customizations,
        language: state.language || 'en', // Ensure language defaults to 'en'
        currency: state.currency || 'AUD',
        dateFormat: state.dateFormat || 'DD/MM/YYYY',
        timezone: state.timezone || 'Australia/Brisbane',
        defaultPageSize: state.defaultPageSize || 25,
        theme: state.theme || 'light',
        autoRefreshInterval: state.autoRefreshInterval || 0,
        newsletterSubscribers: state.newsletterSubscribers,
        newsletterCampaigns: state.newsletterCampaigns,
        newsletterTemplates: state.newsletterTemplates,
        user: state.user,
        orders: state.orders
      }),
      // 🔧 CRITICAL: localStorage 데이터 복원 (Zustand는 .state 래퍼 없이 partialize 결과를 저장할 수 있음)
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== 'object') return currentState
        const p = persistedState as any
        // 형식 1: { state: { products, cart, ... } }
        const data = p.state && typeof p.state === 'object' ? p.state : p
        return {
          ...currentState,
          products: data.products && Array.isArray(data.products) ? data.products : currentState.products,
          cart: data.cart ?? currentState.cart,
          customizations: data.customizations ?? currentState.customizations,
          // English-only storefront: ignore persisted non-English preference
          language: 'en',
          currency: data.currency || currentState.currency || 'AUD',
          dateFormat: data.dateFormat || currentState.dateFormat || 'DD/MM/YYYY',
          timezone: data.timezone || currentState.timezone || 'Australia/Brisbane',
          defaultPageSize: data.defaultPageSize ?? currentState.defaultPageSize ?? 25,
          theme: data.theme ?? currentState.theme ?? 'light',
          autoRefreshInterval: data.autoRefreshInterval ?? currentState.autoRefreshInterval ?? 0,
          newsletterSubscribers: data.newsletterSubscribers ?? currentState.newsletterSubscribers,
          newsletterCampaigns: data.newsletterCampaigns ?? currentState.newsletterCampaigns,
          newsletterTemplates: data.newsletterTemplates ?? currentState.newsletterTemplates,
          user: data.user ?? currentState.user,
          orders: data.orders && Array.isArray(data.orders) ? data.orders : (data.orders ?? currentState.orders)
        }
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn('[selpic-store] persist rehydrate error', error)
        }
        // Defer until after `useStore` is assigned — persist can call this synchronously
        // during `create()`, which triggers "Cannot access 'useStore' before initialization".
        queueMicrotask(() => {
          useStore.setState({ _hasHydrated: true, language: 'en' })
          const latest = useStore.getState()
          if (process.env.NODE_ENV === 'development') {
            console.log('🏪 [Store] Rehydration complete:', {
              productsCount: latest.products.length,
              products: latest.products.map((p) => ({ id: p.id, name: p.name }))
            })
          }
          if (typeof window !== 'undefined' && latest.products.length === 0) {
            void import('@/lib/catalogHydration').then((m) => m.fetchPublicCatalogAndApplyIfEmpty())
          }
        })
      }
    }
  )
) 
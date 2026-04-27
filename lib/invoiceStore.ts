import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { InvoiceTemplateProps, InvoiceLineItem } from '@/components/invoice/InvoiceTemplate'
import { OrderRecord } from '@/lib/store'
import {
  validateInvoicePeriod,
  InvoiceValidationContext,
  getCriticalWarnings as readStoredCriticalWarnings,
} from '@/lib/invoice-validation'
import { COMPANY_LEGAL, COMPANY_BANK, COMPANY_CONTACT, COMPANY_LOGO_URL } from '@/lib/companyLegal'
import { computeAustralianInvoiceTotals } from '@/lib/invoiceTotals'
import { getOrderItemLineMoney } from '@/lib/orderItemLineTotals'
import { getCustomizationSurchargeLabel } from '@/lib/orderCustomizationSurcharge'

// 인보이스 템플릿 기본 데이터 타입
export interface InvoiceTemplateData {
  id: string
  name: string // 템플릿 이름
  company: {
    name: string
    abn?: string
    acn?: string
    domain?: string
    phone?: string
    email?: string
    address?: string
    logoUrl?: string
  }
  payment?: {
    bank?: string
    accountName?: string  // 받는이 / 계좌명
    bsb?: string
    account?: string
    note?: string
    other?: string
  }
  notes?: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface InvoiceStore {
  // 기본 템플릿 데이터
  defaultTemplate: InvoiceTemplateData | null
  setDefaultTemplate: (template: InvoiceTemplateData) => void
  
  // 인보이스 생성 이력
  generatedInvoices: Array<{
    id: string
    orderId: string
    invoiceNumber: string
    customerEmail: string
    billingCycleStart?: string // YYYY-MM-DD format
    billingCycleEnd?: string // YYYY-MM-DD format
    invoiceType?: 'fixed-rate' | 'usage-based'
    planType?: string
    invoiceData: Omit<InvoiceTemplateProps, 'items' | 'totals' | 'shipping' | 'paymentFee'> & {
      items: InvoiceLineItem[]
      totals: { subtotal: number; tax: number; total: number; currency: string }
      discounts?: {
        totalDiscount?: number
        vipDiscount?: number
        promoDiscount?: number
        promoCode?: string
      }
      shipping?: number
      paymentFee?: number
    }
    createdAt: string
    pdfUrl?: string
  }>
  addGeneratedInvoice: (invoice: InvoiceStore['generatedInvoices'][0]) => void
  deleteGeneratedInvoice: (invoiceId: string) => void
  getInvoiceByOrderId: (orderId: string) => InvoiceStore['generatedInvoices'][0] | undefined
  getCriticalWarnings: () => Array<{
    timestamp: string
    type: 'duplicate-cycle' | 'plan-inconsistency' | 'billing-error'
    message: string
    context: InvoiceValidationContext
  }>
}

// 기본 인보이스 템플릿 데이터 (회사 정보·은행 정보 단일 소스: lib/companyLegal.ts)
const defaultInvoiceTemplate: InvoiceTemplateData = {
  id: 'default-invoice-template',
  name: 'Default Invoice Template',
  company: {
    name: COMPANY_LEGAL.companyName,
    abn: COMPANY_LEGAL.abn,
    acn: COMPANY_LEGAL.acn,
    domain: COMPANY_LEGAL.domain,
    phone: COMPANY_CONTACT.phone,
    email: COMPANY_CONTACT.email,
    address: COMPANY_CONTACT.address,
    logoUrl: COMPANY_LOGO_URL
  },
  payment: {
    bank: COMPANY_BANK.bankName,
    accountName: COMPANY_BANK.accountName,
    bsb: COMPANY_BANK.bsb,
    account: COMPANY_BANK.accountNumber,
    note: COMPANY_BANK.paymentNote
  },
  notes: `Thank you for your business! It is a pleasure to help bring your creative ideas to life.\nPlease be advised that payment is due within 7 days of the invoice date.`,
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

export const useInvoiceStore = create<InvoiceStore>()(
  persist(
    (set, get) => ({
      defaultTemplate: defaultInvoiceTemplate,
      setDefaultTemplate: (template) => {
        set({ defaultTemplate: template })
      },
      
      generatedInvoices: [],
      addGeneratedInvoice: (invoice) => {
        console.log('➕ Adding invoice to store:', invoice)
        set((state) => {
          // 기존 중복 방지: 같은 orderId와 invoiceNumber가 이미 있으면 추가하지 않음
          const isDuplicate = state.generatedInvoices.some(
            inv => inv.orderId === invoice.orderId && inv.invoiceNumber === invoice.invoiceNumber
          )
          
          if (isDuplicate) {
            console.log('⚠️ Duplicate invoice detected, skipping:', invoice.invoiceNumber)
            return state
          }
          
          // Period Validation: billing cycle 중복 확인
          if (invoice.billingCycleStart && invoice.billingCycleEnd) {
            const validationContext: InvoiceValidationContext = {
              customerEmail: invoice.customerEmail,
              customerId: invoice.orderId, // Using orderId as customer identifier
              billingCycleStart: invoice.billingCycleStart,
              billingCycleEnd: invoice.billingCycleEnd,
              invoiceType: invoice.invoiceType || 'usage-based',
              planType: invoice.planType,
              invoiceNumber: invoice.invoiceNumber,
              orderId: invoice.orderId
            }
            
            const validation = validateInvoicePeriod(
              validationContext,
              state.generatedInvoices.map(inv => ({
                customerEmail: inv.customerEmail,
                billingCycleStart: inv.billingCycleStart,
                billingCycleEnd: inv.billingCycleEnd,
                invoiceType: inv.invoiceType,
                invoiceNumber: inv.invoiceNumber
              }))
            )
            
            if (!validation.isValid) {
              // Critical warnings are already logged by validateInvoicePeriod
              console.error('🚨 Invoice validation failed:', validation.errors)
              console.error('🚨 Critical warnings:', validation.criticalWarnings)
              
              // Still add the invoice but with warnings
              // Administrator can review critical warnings later
              const newInvoices = [invoice, ...state.generatedInvoices]
              console.warn('⚠️ Invoice added with validation warnings. Please review critical warnings.')
              return {
                generatedInvoices: newInvoices
              }
            }
          }
          
          const newInvoices = [invoice, ...state.generatedInvoices]
          console.log('✅ Invoice added. Total invoices:', newInvoices.length)
          return {
            generatedInvoices: newInvoices
          }
        })
      },
      deleteGeneratedInvoice: (invoiceId) => {
        console.log('🗑️ Deleting invoice from store:', invoiceId)
        set((state) => {
          const filteredInvoices = state.generatedInvoices.filter(inv => inv.id !== invoiceId)
          console.log('✅ Invoice deleted. Remaining invoices:', filteredInvoices.length)
          return {
            generatedInvoices: filteredInvoices
          }
        })
      },
      getInvoiceByOrderId: (orderId) => {
        return get().generatedInvoices.find(inv => inv.orderId === orderId)
      },
      getCriticalWarnings: () => readStoredCriticalWarnings(),
    }),
    {
      name: 'invoice-store',
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('🔄 Invoice store rehydrated:', {
            templateExists: !!state.defaultTemplate,
            invoicesCount: state.generatedInvoices?.length || 0,
            invoices: state.generatedInvoices
          })
        }
      }
    }
  )
)

// 주문 데이터를 인보이스 데이터로 변환하는 함수
export const convertOrderToInvoice = (
  order: OrderRecord,
  template: InvoiceTemplateData
): Omit<InvoiceTemplateProps, 'items' | 'totals' | 'discounts' | 'shipping' | 'paymentFee'> & {
  items: InvoiceLineItem[]
  totals: { subtotal: number; tax: number; total: number; currency: string }
  discounts?: {
    totalDiscount?: number
    vipDiscount?: number
    promoDiscount?: number
    promoCode?: string
  }
  shipping?: number
  paymentFee?: number
} => {
  // 인보이스 번호 생성 (SP-YYYY-XXX 형식)
  // 주문 ID의 마지막 3자리 사용 (Base36 인코딩된 경우 영문 포함 가능)
  const year = new Date().getFullYear()
  const lastThreeChars = order.id.slice(-3)
  // Base36 인코딩된 주문 ID는 영문 포함 가능하므로 그대로 사용
  const invoiceNumber = `SP-${year}-${lastThreeChars.padStart(3, '0')}`
  
  // 주문 아이템을 인보이스 품목으로 변환
  // - 상품 unit price는 GST-inclusive 기준(기본가 + 커스텀 옵션 할증)으로 정의
  // - GST 표시를 위해 unitPrice(ex-GST) = unitPrice(incl GST) / 1.1 로 역산
  const items: InvoiceLineItem[] = order.items.map((item) => {
    const { baseUnit, surchargeUnit } = getOrderItemLineMoney(item)
    const unitPriceInclOptions = baseUnit + surchargeUnit
    const unitPriceExclGST = unitPriceInclOptions / 1.1

    const optionsLabel = surchargeUnit > 0.001 ? getCustomizationSurchargeLabel(item.customizations, { size: item.size }) : ''
    const description =
      surchargeUnit > 0.001
        ? `${item.name}\n${optionsLabel} (+$${surchargeUnit.toFixed(2)} each)`
        : item.name

    return {
      description,
      qty: item.quantity,
      unitPrice: unitPriceExclGST,
      taxRate: 0.1,
    }
  })
  
  // 배송비 항목 추가 (무료 배송이어도 표시)
  const shippingDescription = order.shippingPrice === 0 
    ? `Shipping (Free${order.shippingOptionName ? ` - ${order.shippingOptionName}` : ''})`
    : `Shipping (${order.shippingOptionName || 'Standard'})`
  items.push({
    description: shippingDescription,
    qty: 1,
    unitPrice: order.shippingPrice, // 무료면 0
    taxRate: 0 // 배송비는 GST 면제
  })
  
  // 결제 수수료가 있으면 품목에 추가
  if (order.paymentFee && order.paymentFee > 0) {
    items.push({
      description: `Payment Fee (${order.paymentMethodName || order.paymentMethod.toUpperCase()})`,
      qty: 1,
      unitPrice: order.paymentFee,
      taxRate: 0 // 결제 수수료는 GST 면제
    })
  }
  
  // 할인 정보 추출
  const totalDiscount = order.discount || 0
  const vipDiscount = order.vipDiscount || 0
  const promoDiscount = order.promoDiscount || 0
  const promoCode = order.promoCode
  
  // 주문 상세 페이지와 동일한 계산 방식 적용
  // 주문의 subtotal은 이미 GST 포함 가격
  // 주문 계산식: total = subtotal + shippingPrice + paymentFee - discount
  
  const orderShipping = order.shippingPrice
  const orderPaymentFee = order.paymentFee || 0
  
  // 인보이스 계산 (주문 상세와 동일한 결과를 보장)
  // 주문 계산식: total = subtotal + shippingPrice + paymentFee - discount
  // 주문의 subtotal은 상품 총액 (GST 포함)
  // 주문의 discount는 subtotal (GST 포함) 기준으로 계산된 할인
  
  // 인보이스는 Tax Invoice이므로 GST를 별도로 표시해야 함
  // 할인은 GST 포함 금액 기준이므로, GST 제외 금액 기준으로 변환 필요
  
  const computed = computeAustralianInvoiceTotals({
    items,
    shipping: orderShipping,
    paymentFee: orderPaymentFee,
    discounts: totalDiscount > 0 ? { totalDiscount } : undefined
  })

  // Invoice "Total Due" must stay consistent with displayed subtotal/GST/discount rows.
  // Use the computed GST-aware total for tax-invoice rendering.
  const total = computed.total
  
  // 날짜 계산
  const issueDate = new Date().toISOString().split('T')[0]
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  return {
    company: template.company,
    billing: {
      name: order.customer.name,
      email: order.customer.email,
      phone: order.customer.phone,
      address: order.address.asSingleLine
    },
    invoiceMeta: {
      invoiceNumber,
      issueDate,
      dueDate,
      // Reference: 주문 ID에서 "ORD-" 접두사 제거하여 간략하게 표시
      // Base36 인코딩된 주문 ID: "ORD-lx3k2j1" -> "lx3k2j1"
      // 기존 숫자 형식: "ORD-1765424529434" -> "1765424529434"
      reference: order.id.replace(/^ORD-/, '')
    },
    items,
    totals: {
      // Subtotal: taxable goods ex-GST (before discount); GST: after discount (AU: (inc−D)/11)
      subtotal: computed.subtotalExclGSTGoods,
      tax: computed.gstAmount,
      total, // 주문 total (source of truth; matches computed.total within rounding)
      currency: 'AUD'
    },
    discounts: totalDiscount > 0 ? {
      totalDiscount,
      vipDiscount: vipDiscount > 0 ? vipDiscount : undefined,
      promoDiscount: promoDiscount > 0 ? promoDiscount : undefined,
      promoCode: promoCode || undefined
    } : undefined,
    shipping: orderShipping, // 배송비 (무료면 0, 항상 표시)
    paymentFee: orderPaymentFee > 0 ? orderPaymentFee : undefined, // 결제 수수료 (있는 경우만)
    payment: template.payment,
    notes: template.notes
  }
}


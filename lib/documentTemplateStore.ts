import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { InvoiceTemplateData, useInvoiceStore } from './invoiceStore'
import { COMPANY_LEGAL, COMPANY_BANK, COMPANY_CONTACT, COMPANY_LOGO_URL } from './companyLegal'

// Document Type 정의
export type DocumentType = 
  | 'order_confirmation' 
  | 'receipt' 
  | 'invoice' 
  | 'shipping_notification' 
  | 'contract' 
  | 'other'

// 공통 Company 정보 (모든 문서 타입에서 공유)
export interface CompanyInfo {
  name: string
  abn?: string
  acn?: string
  domain?: string
  phone?: string
  email?: string
  address?: string
  logoUrl?: string
}

// 공통 Payment 정보 (Invoice, Receipt 등에서 사용)
export interface PaymentInfo {
  bank?: string
  accountName?: string  // 받는이 / 계좌명 (e.g. SELPIC PTY LTD)
  bsb?: string
  account?: string
  note?: string
  other?: string
}

// 이메일 설정 (모든 문서 타입에서 사용)
export interface EmailSettings {
  subject: string // {orderId}, {customerName} 등의 placeholder 지원
  greeting?: string // "Dear {customerName}," 같은 인사말
  closing?: string // "Best regards," 같은 마무리
  customMessage?: string // 추가 메시지
}

// Order Confirmation 템플릿
export interface OrderConfirmationTemplate {
  type: 'order_confirmation'
  company: CompanyInfo
  email: EmailSettings
  content: {
    showOrderDetails: boolean // 주문 상세 정보 표시 여부
    showItems: boolean // 주문 항목 표시 여부
    customMessage?: string // 추가 안내 메시지
  }
  lastModified: string
  version: number
}

// Receipt 템플릿
export interface ReceiptTemplate {
  type: 'receipt'
  company: CompanyInfo
  payment?: PaymentInfo
  email: EmailSettings
  content: {
    showPaymentMethod: boolean
    showItems: boolean
    customMessage?: string
  }
  lastModified: string
  version: number
}

// Invoice 템플릿 (InvoiceTemplateData와 연동)
export interface InvoiceDocumentTemplate {
  type: 'invoice'
  company: CompanyInfo
  payment?: PaymentInfo
  email: EmailSettings
  content: {
    notes?: string // Invoice 하단 Notes
    customMessage?: string
  }
  lastModified: string
  version: number
}

// Shipping Notification 템플릿
export interface ShippingNotificationTemplate {
  type: 'shipping_notification'
  company: CompanyInfo
  email: EmailSettings
  content: {
    showTrackingInfo: boolean
    showEstimatedDelivery: boolean
    customMessage?: string
  }
  lastModified: string
  version: number
}

// Contract 템플릿
export interface ContractTemplate {
  type: 'contract'
  company: CompanyInfo
  email: EmailSettings
  content: {
    contractText?: string // 계약서 본문
    customMessage?: string
  }
  lastModified: string
  version: number
}

// Other Document 템플릿
export interface OtherDocumentTemplate {
  type: 'other'
  company: CompanyInfo
  email: EmailSettings
  content: {
    documentText?: string
    customMessage?: string
  }
  lastModified: string
  version: number
}

// 모든 템플릿 타입의 Union
export type DocumentTemplate = 
  | OrderConfirmationTemplate
  | ReceiptTemplate
  | InvoiceDocumentTemplate
  | ShippingNotificationTemplate
  | ContractTemplate
  | OtherDocumentTemplate

// Document Template Store 인터페이스
interface DocumentTemplateStore {
  // 각 타입별 템플릿 저장
  templates: Record<DocumentType, DocumentTemplate | null>
  
  // 템플릿 가져오기
  getTemplate: (type: DocumentType) => DocumentTemplate | null
  
  // 템플릿 업데이트
  updateTemplate: (type: DocumentType, template: Partial<DocumentTemplate>) => void
  
  // 템플릿 리셋 (기본값으로)
  resetTemplate: (type: DocumentType) => void
  
  // 모든 템플릿 리셋
  resetAllTemplates: () => void
  
  // Invoice 템플릿을 useInvoiceStore와 동기화
  syncInvoiceTemplate: () => void
}

// 기본 Company 정보 (모든 템플릿에서 공유, ABN/ACN·연락처·로고 단일 소스: lib/companyLegal.ts)
const getDefaultCompany = (): CompanyInfo => ({
  name: COMPANY_LEGAL.companyName,
  abn: COMPANY_LEGAL.abn,
  acn: COMPANY_LEGAL.acn,
  domain: COMPANY_LEGAL.domain,
  phone: COMPANY_CONTACT.phone,
  email: COMPANY_CONTACT.email,
  address: COMPANY_CONTACT.address,
  logoUrl: COMPANY_LOGO_URL
})

// 기본 Payment 정보 (회사 은행 정보 단일 소스: lib/companyLegal.ts COMPANY_BANK)
const getDefaultPayment = (): PaymentInfo => ({
  bank: COMPANY_BANK.bankName,
  accountName: COMPANY_BANK.accountName,
  bsb: COMPANY_BANK.bsb,
  account: COMPANY_BANK.accountNumber,
  note: COMPANY_BANK.paymentNote
})

// 기본 이메일 설정 생성 함수
const getDefaultEmailSettings = (type: DocumentType, companyName: string = COMPANY_LEGAL.companyName): EmailSettings => {
  const baseSettings: EmailSettings = {
    subject: '',
    greeting: 'Dear {customerName},',
    closing: 'Kind regards,',
    customMessage: ''
  }
  
  switch (type) {
    case 'order_confirmation':
      return {
        ...baseSettings,
        subject: '[SELPIC] Order Confirmed: {orderId} | Thank you for your business!',
        customMessage:
          'Automated order confirmation emails use the fixed template in lib/orderConfirmationEmail.ts (subject + HTML). ' +
          'Edit that file to change customer-facing copy.'
      }
    case 'receipt':
      return {
        ...baseSettings,
        subject: 'Receipt {orderId} from {companyName}',
        customMessage:
          'We appreciate your business with {companyName}.\n\n' +
          'Please find your receipt details below for your records.\n\n' +
          'If you have any questions, please reply to this email and include your Order ID ({orderId}).'
      }
    case 'invoice':
      return {
        ...baseSettings,
        subject: 'Tax Invoice {invoiceNumber} from {companyName}',
        customMessage:
          'We appreciate your business with {companyName}.\n\n' +
          'Please find the attached tax invoice ({invoiceNumber}) for your recent order/service.\n\n' +
          'Payment Instructions:\n' +
          'For bank transfers, please ensure the Invoice Number is included as your payment reference to help us identify your payment.\n\n' +
          'Thank you for choosing us. If you have any questions, please feel free to reply to this email.'
      }
    case 'shipping_notification':
      return {
        ...baseSettings,
        subject: 'Shipping Update {orderId} from {companyName}',
        customMessage:
          'We appreciate your business with {companyName}.\n\n' +
          'Good news — your order has been dispatched.\n\n' +
          'Tracking details are included below.\n\n' +
          'If any delivery details need to be corrected, please reply to this email as soon as possible and include your Order ID ({orderId}).'
      }
    case 'contract':
      return {
        ...baseSettings,
        subject: 'Contract Document from {companyName}',
        customMessage:
          'We appreciate your business with {companyName}.\n\n' +
          'Please find the attached contract document.\n\n' +
          'If you have any questions or require clarification, please reply to this email.'
      }
    default:
      return {
        ...baseSettings,
        subject: 'Document from {companyName}',
        customMessage:
          'We appreciate your business with {companyName}.\n\n' +
          'Please find the requested document attached.\n\n' +
          'If you have any questions, please reply to this email.'
      }
  }
}

// Previous defaults (used to migrate older saved templates without overwriting custom edits)
const PREV_DEFAULT_ORDER_SUBJECT = '[SELPIC] Order confirmed - #{orderId}'
const PREV_DEFAULT_ORDER_MESSAGE =
  'Thanks for your order.\n\nWe have received your payment and started processing your items.\n\nFor quick support, reply directly to this email with your order number.'
const PREV_DEFAULT_RECEIPT_SUBJECT = 'Receipt - Order #{orderId}'
const PREV_DEFAULT_RECEIPT_MESSAGE = 'Please find your receipt below. Thank you for your purchase!'
const PREV_DEFAULT_SHIPPING_SUBJECT = '[SELPIC] Shipping update - Order #{orderId}'
const PREV_DEFAULT_SHIPPING_MESSAGE =
  'Good news - your order is on the way.\n\nTracking details are included below.\n\nIf your delivery details need correction, reply to this email as soon as possible.'
const PREV_DEFAULT_CONTRACT_SUBJECT = 'Contract Document - {companyName}'
const PREV_DEFAULT_CONTRACT_MESSAGE =
  'Please find the contract document attached. This contract outlines the terms and conditions of our agreement.'
const PREV_DEFAULT_OTHER_MESSAGE = 'Please find the requested document attached.'

const LEGACY_ORDER_SUBJECT = 'Order Confirmation - Order #{orderId}'
const LEGACY_ORDER_MESSAGE =
  'Thank you for your order!\n\nYour order has been confirmed and is being processed. You will receive a shipping notification once your order has been dispatched.'
const LEGACY_SHIPPING_SUBJECT = 'Shipping Notification - Order #{orderId}'
const LEGACY_SHIPPING_MESSAGE = 'Your order has been shipped! Your order is on its way to you.'

function migrateEmailDeliverabilityTemplates(
  templates: Record<DocumentType, DocumentTemplate | null>
): Record<DocumentType, DocumentTemplate | null> {
  const next = { ...templates }
  const defaultCompanyName = COMPANY_LEGAL.companyName
  const newOrder = getDefaultEmailSettings('order_confirmation', defaultCompanyName)
  const newShipping = getDefaultEmailSettings('shipping_notification', defaultCompanyName)
  const newReceipt = getDefaultEmailSettings('receipt', defaultCompanyName)
  const newContract = getDefaultEmailSettings('contract', defaultCompanyName)
  const newOther = getDefaultEmailSettings('other', defaultCompanyName)

  const orderTemplate = next.order_confirmation
  if (orderTemplate && orderTemplate.type === 'order_confirmation') {
    const current = orderTemplate.email
    const shouldUpgradeSubject =
      !current.subject ||
      current.subject === LEGACY_ORDER_SUBJECT ||
      current.subject === PREV_DEFAULT_ORDER_SUBJECT
    const shouldUpgradeMessage =
      !current.customMessage ||
      current.customMessage === LEGACY_ORDER_MESSAGE ||
      current.customMessage === PREV_DEFAULT_ORDER_MESSAGE
    if (shouldUpgradeSubject || shouldUpgradeMessage) {
      next.order_confirmation = {
        ...orderTemplate,
        email: {
          ...current,
          subject: shouldUpgradeSubject ? newOrder.subject : current.subject,
          customMessage: shouldUpgradeMessage ? newOrder.customMessage : current.customMessage
        }
      }
    }
  }

  const receiptTemplate = next.receipt
  if (receiptTemplate && receiptTemplate.type === 'receipt') {
    const current = receiptTemplate.email
    const shouldUpgradeSubject =
      !current.subject ||
      current.subject === PREV_DEFAULT_RECEIPT_SUBJECT
    const shouldUpgradeMessage =
      !current.customMessage ||
      current.customMessage === PREV_DEFAULT_RECEIPT_MESSAGE
    if (shouldUpgradeSubject || shouldUpgradeMessage) {
      next.receipt = {
        ...receiptTemplate,
        email: {
          ...current,
          subject: shouldUpgradeSubject ? newReceipt.subject : current.subject,
          customMessage: shouldUpgradeMessage ? newReceipt.customMessage : current.customMessage
        }
      }
    }
  }

  const shippingTemplate = next.shipping_notification
  if (shippingTemplate && shippingTemplate.type === 'shipping_notification') {
    const current = shippingTemplate.email
    const shouldUpgradeSubject =
      !current.subject ||
      current.subject === LEGACY_SHIPPING_SUBJECT ||
      current.subject === PREV_DEFAULT_SHIPPING_SUBJECT
    const shouldUpgradeMessage =
      !current.customMessage ||
      current.customMessage === LEGACY_SHIPPING_MESSAGE ||
      current.customMessage === PREV_DEFAULT_SHIPPING_MESSAGE
    if (shouldUpgradeSubject || shouldUpgradeMessage) {
      next.shipping_notification = {
        ...shippingTemplate,
        email: {
          ...current,
          subject: shouldUpgradeSubject ? newShipping.subject : current.subject,
          customMessage: shouldUpgradeMessage ? newShipping.customMessage : current.customMessage
        }
      }
    }
  }

  const contractTemplate = next.contract
  if (contractTemplate && contractTemplate.type === 'contract') {
    const current = contractTemplate.email
    const shouldUpgradeSubject =
      !current.subject ||
      current.subject === PREV_DEFAULT_CONTRACT_SUBJECT
    const shouldUpgradeMessage =
      !current.customMessage ||
      current.customMessage === PREV_DEFAULT_CONTRACT_MESSAGE
    if (shouldUpgradeSubject || shouldUpgradeMessage) {
      next.contract = {
        ...contractTemplate,
        email: {
          ...current,
          subject: shouldUpgradeSubject ? newContract.subject : current.subject,
          customMessage: shouldUpgradeMessage ? newContract.customMessage : current.customMessage
        }
      }
    }
  }

  const otherTemplate = next.other
  if (otherTemplate && otherTemplate.type === 'other') {
    const current = otherTemplate.email
    const shouldUpgradeMessage =
      !current.customMessage ||
      current.customMessage === PREV_DEFAULT_OTHER_MESSAGE
    if (shouldUpgradeMessage) {
      next.other = {
        ...otherTemplate,
        email: {
          ...current,
          customMessage: newOther.customMessage
        }
      }
    }
  }

  return next
}

// 기본 템플릿 생성 함수
const createDefaultTemplate = (type: DocumentType): DocumentTemplate => {
  const company = getDefaultCompany()
  const email = getDefaultEmailSettings(type, company.name)
  const now = new Date().toISOString()
  
  switch (type) {
    case 'order_confirmation':
      return {
        type: 'order_confirmation',
        company,
        email,
        content: {
          showOrderDetails: true,
          showItems: true,
          customMessage: 'If you have any questions, please reply to this email and include your Order ID.'
        },
        lastModified: now,
        version: 1
      }
    case 'receipt':
      return {
        type: 'receipt',
        company,
        payment: getDefaultPayment(),
        email,
        content: {
          showPaymentMethod: true,
          showItems: true,
          customMessage: 'If you have any questions, please reply to this email and include your Order ID.'
        },
        lastModified: now,
        version: 1
      }
    case 'invoice':
      return {
        type: 'invoice',
        company,
        payment: getDefaultPayment(),
        email,
        content: {
          notes: 'Thank you for your business! It is a pleasure to help bring your creative ideas to life.\nPlease be advised that payment is due within 7 days of the invoice date.',
          customMessage: 'If you have any questions about this invoice, please contact us.'
        },
        lastModified: now,
        version: 1
      }
    case 'shipping_notification':
      return {
        type: 'shipping_notification',
        company,
        email,
        content: {
          showTrackingInfo: true,
          showEstimatedDelivery: true,
          customMessage: 'If you have any questions about delivery, please reply to this email and include your Order ID.'
        },
        lastModified: now,
        version: 1
      }
    case 'contract':
      return {
        type: 'contract',
        company,
        email,
        content: {
          contractText: 'This contract outlines the terms and conditions of our agreement.',
          customMessage: 'If you have any questions or require clarification, please reply to this email.'
        },
        lastModified: now,
        version: 1
      }
    default:
      return {
        type: 'other',
        company,
        email,
        content: {
          documentText: 'Please find the requested document attached.',
          customMessage: 'If you have any questions, please reply to this email.'
        },
        lastModified: now,
        version: 1
      }
  }
}

// 초기 템플릿 상태
const initialTemplates: Record<DocumentType, DocumentTemplate | null> = {
  order_confirmation: createDefaultTemplate('order_confirmation'),
  receipt: createDefaultTemplate('receipt'),
  invoice: createDefaultTemplate('invoice'),
  shipping_notification: createDefaultTemplate('shipping_notification'),
  contract: createDefaultTemplate('contract'),
  other: createDefaultTemplate('other')
}

export const useDocumentTemplateStore = create<DocumentTemplateStore>()(
  persist(
    (set, get) => ({
      templates: initialTemplates,
      
      getTemplate: (type) => {
        const template = get().templates[type]
        // 템플릿이 없으면 기본 템플릿 생성
        if (!template) {
          const defaultTemplate = createDefaultTemplate(type)
          set((state) => ({
            templates: { ...state.templates, [type]: defaultTemplate }
          }))
          return defaultTemplate
        }
        return template
      },
      
      updateTemplate: (type, updates) => {
        set((state) => {
          const currentTemplate = state.templates[type] || createDefaultTemplate(type)
          const updatedTemplate = {
            ...currentTemplate,
            ...updates,
            type, // type은 변경 불가
            lastModified: new Date().toISOString(),
            version: currentTemplate.version + 1
          } as DocumentTemplate
          
          return {
            templates: {
              ...state.templates,
              [type]: updatedTemplate
            }
          }
        })
        
        // Invoice 템플릿 업데이트 시 useInvoiceStore와 동기화
        if (type === 'invoice') {
          get().syncInvoiceTemplate()
        }
      },
      
      resetTemplate: (type) => {
        const defaultTemplate = createDefaultTemplate(type)
        set((state) => ({
          templates: {
            ...state.templates,
            [type]: defaultTemplate
          }
        }))
        
        // Invoice 템플릿 리셋 시 useInvoiceStore와 동기화
        if (type === 'invoice') {
          get().syncInvoiceTemplate()
        }
      },
      
      resetAllTemplates: () => {
        set({
          templates: initialTemplates
        })
        // Invoice 템플릿도 동기화
        get().syncInvoiceTemplate()
      },
      
      syncInvoiceTemplate: () => {
        // useInvoiceStore의 defaultTemplate과 동기화
        const invoiceTemplate = get().templates.invoice as InvoiceDocumentTemplate | null
        if (invoiceTemplate) {
          const invoiceStore = useInvoiceStore.getState()
          const currentTemplate = invoiceStore.defaultTemplate
          
          // Invoice 템플릿의 company와 payment 정보를 useInvoiceStore에 반영
          if (currentTemplate) {
            const updatedTemplate: InvoiceTemplateData = {
              ...currentTemplate,
              company: invoiceTemplate.company,
              payment: invoiceTemplate.payment,
              notes: invoiceTemplate.content.notes || currentTemplate.notes,
              updatedAt: new Date().toISOString()
            }
            invoiceStore.setDefaultTemplate(updatedTemplate)
          }
        }
      }
    }),
    {
      name: 'document-template-store',
      version: 2,
      migrate: (persistedState: any) => {
        const currentTemplates = persistedState?.templates
        if (!currentTemplates) return persistedState
        return {
          ...persistedState,
          templates: migrateEmailDeliverabilityTemplates(currentTemplates)
        }
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.templates = migrateEmailDeliverabilityTemplates(state.templates)
          console.log('🔄 Document Template Store rehydrated:', {
            templatesCount: Object.keys(state.templates).length,
            templates: Object.keys(state.templates).map(type => ({
              type,
              exists: !!state.templates[type as DocumentType],
              version: state.templates[type as DocumentType]?.version || 0
            }))
          })
          
          // 초기화 시 Invoice 템플릿 동기화
          state.syncInvoiceTemplate()
        }
      }
    }
  )
)

// 초기화 함수: useInvoiceStore의 defaultTemplate을 Document Template Store의 Invoice 템플릿과 동기화
export const initializeDocumentTemplates = () => {
  if (typeof window === 'undefined') return
  
  try {
    const invoiceStore = useInvoiceStore.getState()
    const templateStore = useDocumentTemplateStore.getState()
    
    // Invoice 템플릿이 없거나, useInvoiceStore의 템플릿이 더 최신이면 동기화
    const invoiceTemplate = templateStore.templates.invoice
    const invoiceStoreTemplate = invoiceStore.defaultTemplate
    
    if (invoiceStoreTemplate && (!invoiceTemplate || 
        new Date(invoiceStoreTemplate.updatedAt) > new Date(invoiceTemplate.lastModified))) {
      // useInvoiceStore의 템플릿을 Document Template Store에 반영
      const syncedTemplate: InvoiceDocumentTemplate = {
        type: 'invoice',
        company: invoiceStoreTemplate.company,
        payment: invoiceStoreTemplate.payment,
        email: getDefaultEmailSettings('invoice', invoiceStoreTemplate.company.name),
        content: {
          notes: invoiceStoreTemplate.notes,
          customMessage: 'If you have any questions about this invoice, please contact us.'
        },
        lastModified: invoiceStoreTemplate.updatedAt,
        version: 1
      }
      templateStore.updateTemplate('invoice', syncedTemplate)
    } else if (invoiceTemplate) {
      // Document Template Store의 템플릿을 useInvoiceStore에 반영
      templateStore.syncInvoiceTemplate()
    }
  } catch (error) {
    console.warn('Failed to initialize document templates:', error)
  }
}


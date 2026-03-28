'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FileText, 
  Search, 
  Send,
  Users,
  ArrowLeft,
  Calendar,
  RefreshCw,
  X,
  CheckCircle,
  AlertCircle,
  Download,
  History,
  Receipt,
  Package,
  FileCheck,
  Mail,
  UserCheck,
  Filter,
  Paperclip,
  File as FileIcon,
  Plus,
  Eye,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import AdminPageHeader from '@/components/AdminPageHeader'
import { useAdminAuth } from '@/lib/adminAuth'
import { useStore, OrderRecord } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'
import { emailService } from '@/lib/emailService'
import AdminRoute from '@/components/AdminRoute'
import { useTranslation } from '@/lib/useTranslation'
import { useInvoiceStore, convertOrderToInvoice } from '@/lib/invoiceStore'
import InvoiceTemplate, { InvoiceLineItem, InvoiceTemplateProps } from '@/components/invoice/InvoiceTemplate'
import QuoteTemplate, { QuoteTemplateProps } from '@/components/invoice/QuoteTemplate'
import OrderReceipt from '@/components/OrderReceipt'
import ShippingNotificationTemplate from '@/components/ShippingNotificationTemplate'
import OrderConfirmationTemplate from '@/components/OrderConfirmationTemplate'
import { useDocumentTemplateStore, initializeDocumentTemplates, DocumentType } from '@/lib/documentTemplateStore'
import { COMPANY_LEGAL, COMPANY_BANK, COMPANY_CONTACT, COMPANY_LOGO_URL } from '@/lib/companyLegal'

// 문서 발송 이력 인터페이스
interface DocumentSendHistory {
  id: string
  documentType: 'order_confirmation' | 'shipping_notification' | 'receipt' | 'invoice' | 'contract' | 'other'
  recipientEmail: string
  recipientName: string
  subject: string
  content: string
  sentAt: string
  sentBy: string
  status: 'sent' | 'failed' | 'pending'
  relatedOrderId?: string
  attachmentUrl?: string
}

export default function DocumentSenderPage() {
  const router = useRouter()
  const { adminUser } = useAdminAuth()
  const { users } = useUserAuth()
  const { orders } = useStore()
  const { t } = useTranslation()
  const { defaultTemplate, setDefaultTemplate, addGeneratedInvoice, deleteGeneratedInvoice, generatedInvoices } = useInvoiceStore()
  const documentTemplates = useDocumentTemplateStore()
  
  // 템플릿 스토어 초기화 (Invoice 템플릿과 동기화)
  useEffect(() => {
    initializeDocumentTemplates()
    
    // 디버깅: 템플릿 스토어 상태 확인
    const templates = documentTemplates.templates
    console.log('📧 Document Templates Store:', {
      templatesCount: Object.keys(templates).length,
      templates: Object.keys(templates).map(type => ({
        type,
        exists: !!templates[type as DocumentType],
        hasEmail: !!templates[type as DocumentType]?.email,
        subject: templates[type as DocumentType]?.email?.subject || 'N/A'
      }))
    })
  }, [])
  
  // 디버깅: 인보이스 상태 확인
  useEffect(() => {
    console.log('📋 Generated Invoices:', {
      count: generatedInvoices.length,
      invoices: generatedInvoices
    })
  }, [generatedInvoices])
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDocumentType, setSelectedDocumentType] = useState<'order_confirmation' | 'shipping_notification' | 'receipt' | 'invoice' | 'contract' | 'other'>('order_confirmation')
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [documentData, setDocumentData] = useState({
    subject: '',
    content: '',
    relatedOrderId: ''
  })
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'send' | 'history' | 'invoices' | 'settings' | 'create'>('send')
  const [templateEditData, setTemplateEditData] = useState<{ company: any; payment: any } | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null)
  const [sendHistory, setSendHistory] = useState<DocumentSendHistory[]>([])
  const [filterType, setFilterType] = useState<'all' | DocumentSendHistory['documentType']>('all')
  const [orderSearchTerm, setOrderSearchTerm] = useState('')
  
  // Document Template 편집 관련 상태
  const [editingTemplateType, setEditingTemplateType] = useState<DocumentType | null>(null)
  const [templateEditModalOpen, setTemplateEditModalOpen] = useState(false)
  
  // 인보이스 관련 상태
  const [invoiceData, setInvoiceData] = useState<Omit<InvoiceTemplateProps, 'items' | 'totals' | 'shipping' | 'paymentFee'> & {
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
  } | null>(null)
  const [showInvoicePreview, setShowInvoicePreview] = useState(false)
  const invoiceRef = React.useRef<HTMLDivElement>(null)

  type SavedClientProfile = {
    id: string
    label: string
    category: 'sticker' | 'cleaning'
    billing: {
      companyName?: string
      companyAbn?: string
      serviceAddress?: string
      serviceDate?: string
      name?: string
      email?: string
      phone?: string
      address?: string
    }
  }

  // Create Invoice & Quote 관련 상태
  const [createDocumentType, setCreateDocumentType] = useState<'invoice' | 'quote'>('invoice')
  /** 스티커 vs 청소 비즈니스 – 통합 관리용 */
  const [createDocumentCategory, setCreateDocumentCategory] = useState<'sticker' | 'cleaning'>('sticker')
  const [showCreateEditForm, setShowCreateEditForm] = useState(true)
  /** Step 1–5: 필요 시에만 펼쳐서 볼 수 있도록 접기/펼치기 */
  const [showStep1CompanyInfo, setShowStep1CompanyInfo] = useState(false)
  const [showStep2BillingInfo, setShowStep2BillingInfo] = useState(false)
  const [showStep3Details, setShowStep3Details] = useState(false)
  const [showStep4LineItems, setShowStep4LineItems] = useState(false)
  const [showStep5Discounts, setShowStep5Discounts] = useState(false)
  const [isGeneratingCreatePDF, setIsGeneratingCreatePDF] = useState(false)
  const [isSendingCreate, setIsSendingCreate] = useState(false)
  const [createRecipientEmail, setCreateRecipientEmail] = useState('')
  const createInvoiceRef = React.useRef<HTMLDivElement>(null)
  // 청소/스티커 파트너 업체 저장 프로필
  const [savedClients, setSavedClients] = useState<SavedClientProfile[]>([])
  const [selectedSavedClientId, setSelectedSavedClientId] = useState<string>('')
  const [newSavedClientLabel, setNewSavedClientLabel] = useState<string>('')

  // Saved clients localStorage 동기화
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem('selpic_saved_clients_v1')
      if (raw) {
        const parsed = JSON.parse(raw) as SavedClientProfile[]
        setSavedClients(parsed)
      }
    } catch (e) {
      console.warn('Failed to load saved clients', e)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('selpic_saved_clients_v1', JSON.stringify(savedClients))
    } catch (e) {
      console.warn('Failed to save clients', e)
    }
  }, [savedClients])
  
  // 비즈니스 유형별 기본 품목 (스티커 vs 청소)
  const getDefaultItemsByCategory = (category: 'sticker' | 'cleaning'): InvoiceLineItem[] => {
    if (category === 'cleaning') {
      return [
        { description: 'Regular Cleaning Service (per visit)', qty: 1, unitPrice: 0, taxRate: 0.1 },
        { description: 'Deep Clean / End of Lease', qty: 0, unitPrice: 0, taxRate: 0.1 },
        { description: 'Additional Services (carpet, windows, etc.)', qty: 0, unitPrice: 0, taxRate: 0.1 }
      ]
    }
    return [
      { description: 'Custom Stickers (Premium Gloss)', qty: 2, unitPrice: 25, taxRate: 0.1 },
      { description: 'Stamp Product (Self-inking)', qty: 1, unitPrice: 32, taxRate: 0.1 },
      { description: 'Shipping (Standard)', qty: 1, unitPrice: 10, taxRate: 0 }
    ]
  }
  const getDefaultNotesByCategory = (category: 'sticker' | 'cleaning'): string => {
    if (category === 'cleaning') {
      return 'Thank you for choosing our cleaning services.\nPayment is due within 7 days of the invoice date.\nPlease contact us to confirm booking and for any special requirements.'
    }
    return 'Thank you for your business! It is a pleasure to help bring your creative ideas to life.\nPlease be advised that payment is due within 7 days of the invoice date.'
  }

  // Create Invoice 기본 데이터 생성 함수 (회사·결제 정보는 항상 lib/companyLegal 단일 소스 사용)
  const getDefaultCreateInvoiceData = (category?: 'sticker' | 'cleaning'): Omit<InvoiceTemplateProps, 'items' | 'totals'> & {
    items: InvoiceLineItem[]
    totals: { subtotal: number; tax: number; total: number; currency: string }
    discounts?: {
      totalDiscount?: number
      vipDiscount?: number
      vipDiscountPercent?: number
      promoDiscount?: number
      promoDiscountPercent?: number
      promoCode?: string
    }
    shipping?: number
    paymentFee?: number
  } => {
    const company = {
      name: COMPANY_LEGAL.companyName,
      abn: COMPANY_LEGAL.abn,
      acn: COMPANY_LEGAL.acn,
      phone: COMPANY_CONTACT.phone,
      email: COMPANY_CONTACT.email,
      address: COMPANY_CONTACT.address,
      logoUrl: COMPANY_LOGO_URL
    }
    const payment = {
      bank: COMPANY_BANK.bankName,
      accountName: COMPANY_BANK.accountName,
      bsb: COMPANY_BANK.bsb,
      account: COMPANY_BANK.accountNumber,
      note: COMPANY_BANK.paymentNote
    }
    return {
      company,
      billing: {
        companyName: '',
        companyAbn: '',
        serviceAddress: '',
        serviceDate: '',
        name: '',
        email: '',
        phone: '',
        address: ''
      },
      invoiceMeta: {
        invoiceNumber: `SP-${new Date().getFullYear()}-${String(generatedInvoices.length + 1).padStart(3, '0')}`,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reference: ''
      },
      items: getDefaultItemsByCategory(category ?? 'sticker'),
      totals: { subtotal: 0, tax: 0, total: 0, currency: 'AUD' },
      discounts: {
        totalDiscount: 0,
        vipDiscount: 0,
        vipDiscountPercent: undefined,
        promoDiscount: 0,
        promoDiscountPercent: undefined,
        promoCode: ''
      },
      shipping: 0,
      paymentFee: 0,
      payment,
      notes: getDefaultNotesByCategory(category ?? 'sticker')
    }
  }

  const [createInvoiceData, setCreateInvoiceData] = useState(() => getDefaultCreateInvoiceData())
  const [createQuoteData, setCreateQuoteData] = useState<Omit<QuoteTemplateProps, 'items' | 'totals'> & {
    items: InvoiceLineItem[]
    totals: { subtotal: number; tax: number; total: number; currency: string }
    discounts?: {
      totalDiscount?: number
      vipDiscount?: number
      vipDiscountPercent?: number
      promoDiscount?: number
      promoDiscountPercent?: number
      promoCode?: string
    }
    shipping?: number
    paymentFee?: number
  }>(() => {
    const baseData = getDefaultCreateInvoiceData()
    return {
      ...baseData,
      quoteMeta: {
        quoteNumber: `QT-${new Date().getFullYear()}-${String(generatedInvoices.length + 1).padStart(3, '0')}`,
        issueDate: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reference: ''
      }
    }
  })

  // Create Invoice/Quote 합계 자동 계산
  useEffect(() => {
    const data = createDocumentType === 'invoice' ? createInvoiceData : createQuoteData
    const subtotal = data.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
    const tax = data.items.reduce(
      (sum, item) => sum + (item.taxRate ? item.unitPrice * item.qty * item.taxRate : 0),
      0
    )
    
    const vipDiscountPercent = data.discounts?.vipDiscountPercent !== undefined && data.discounts?.vipDiscountPercent !== null
      ? data.discounts.vipDiscountPercent
      : 0
    const vipDiscount = vipDiscountPercent > 0 ? subtotal * (vipDiscountPercent / 100) : 0
    
    const promoDiscountPercent = data.discounts?.promoDiscountPercent !== undefined && data.discounts?.promoDiscountPercent !== null
      ? data.discounts.promoDiscountPercent
      : 0
    const promoDiscount = promoDiscountPercent > 0 ? subtotal * (promoDiscountPercent / 100) : 0
    const totalDiscount = vipDiscount + promoDiscount
    
    const shipping = data.shipping || 0
    const paymentFee = data.paymentFee || 0
    const total = subtotal + tax - totalDiscount + shipping + paymentFee
    
    if (createDocumentType === 'invoice') {
      setCreateInvoiceData(prev => ({
        ...prev,
        discounts: {
          ...prev.discounts,
          vipDiscount: vipDiscount > 0.01 ? vipDiscount : undefined,
          promoDiscount: promoDiscount > 0.01 ? promoDiscount : undefined,
          totalDiscount: totalDiscount > 0.01 ? totalDiscount : undefined
        },
        totals: { ...prev.totals, subtotal, tax, total }
      }))
    } else {
      setCreateQuoteData(prev => ({
        ...prev,
        discounts: {
          ...prev.discounts,
          vipDiscount: vipDiscount > 0.01 ? vipDiscount : undefined,
          promoDiscount: promoDiscount > 0.01 ? promoDiscount : undefined,
          totalDiscount: totalDiscount > 0.01 ? totalDiscount : undefined
        },
        totals: { ...prev.totals, subtotal, tax, total }
      }))
    }
  }, [createDocumentType, createInvoiceData.items, createInvoiceData.discounts?.vipDiscountPercent, createInvoiceData.discounts?.promoDiscountPercent, createInvoiceData.shipping, createInvoiceData.paymentFee, createQuoteData.items, createQuoteData.discounts?.vipDiscountPercent, createQuoteData.discounts?.promoDiscountPercent, createQuoteData.shipping, createQuoteData.paymentFee])

  // 고객 목록 (주문 이력이 있는 고객 + 일반 사용자)
  const allCustomers = [
    ...new Set([
      ...orders.map(o => o.customer.email),
      ...users.map(u => u.email)
    ])
  ].map(email => {
    const order = orders.find(o => o.customer.email === email)
    const user = users.find(u => u.email === email)
    return {
      email,
      name: order?.customer.name || user?.name || email.split('@')[0],
      phone: order?.customer.phone || user?.phone || '',
      hasOrders: !!order,
      lastOrderDate: order ? new Date(order.createdAtIso).toLocaleDateString() : null
    }
  }).filter(c => {
    const matchesSearch = c.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // 문서 유형 정보
  const getDocumentTypeInfo = (type: string) => {
    switch (type) {
      case 'order_confirmation':
        return { icon: CheckCircle, color: 'bg-blue-100 text-blue-800', label: 'Order Confirmation', description: '주문 확인서' }
      case 'shipping_notification':
        return { icon: Package, color: 'bg-green-100 text-green-800', label: 'Shipping Notification', description: '배송 알림' }
      case 'receipt':
        return { icon: Receipt, color: 'bg-purple-100 text-purple-800', label: 'Receipt', description: '영수증' }
      case 'invoice':
        return { icon: FileCheck, color: 'bg-orange-100 text-orange-800', label: 'Invoice', description: '청구서' }
      case 'contract':
        return { icon: FileText, color: 'bg-indigo-100 text-indigo-800', label: 'Contract', description: '계약서' }
      default:
        return { icon: FileText, color: 'bg-gray-100 text-gray-800', label: 'Other Document', description: '기타 문서' }
    }
  }

  // 문서 유형별 기본 제목 및 내용 생성
  const generateDocumentContent = (type: string, orderId?: string) => {
    const order = orderId ? orders.find(o => o.id === orderId) : null
    const customerName = order?.customer.name || 'Customer'
    const companyName = defaultTemplate?.company.name || COMPANY_LEGAL.companyName
    
    switch (type) {
      case 'order_confirmation':
        return {
          subject: `Order Confirmation - Order #${orderId || 'N/A'}`,
          content: `Dear ${customerName},

Thank you for your order!

Order Number: ${orderId || 'N/A'}
Order Date: ${order ? new Date(order.createdAtIso).toLocaleDateString() : new Date().toLocaleDateString()}
Total Amount: $${order?.total.toFixed(2) || '0.00'}

Your order has been confirmed and is being processed. You will receive a shipping notification once your order has been dispatched.

If you have any questions, please don't hesitate to contact us.

Best regards,
${companyName} Team`
        }
      case 'shipping_notification':
        return {
          subject: `Shipping Notification - Order #${orderId || 'N/A'}`,
          content: `Dear ${customerName},

Your order has been shipped!

Order Number: ${orderId || 'N/A'}
${order?.tracking?.number ? `Tracking Number: ${order.tracking.number}` : ''}
${order?.tracking?.provider ? `Shipping Provider: ${order.tracking.provider}` : ''}

Your order is on its way to you. You can track your shipment using the tracking number above.

Expected delivery: ${order?.tracking?.estimatedDelivery || 'Please check tracking for delivery date'}

Thank you for your purchase!

Best regards,
${companyName} Team`
        }
      case 'receipt':
        return {
          subject: `Receipt - Order #${orderId || 'N/A'}`,
          content: `Dear ${customerName},

Please find your receipt below:

Order Number: ${orderId || 'N/A'}
Order Date: ${order ? new Date(order.createdAtIso).toLocaleDateString() : new Date().toLocaleDateString()}
Subtotal: $${order?.subtotal.toFixed(2) || '0.00'}
Shipping: $${order?.shippingPrice.toFixed(2) || '0.00'}
Total: $${order?.total.toFixed(2) || '0.00'}

Payment Method: ${order?.paymentMethod || 'N/A'}

Thank you for your purchase!

Best regards,
${companyName} Team`
        }
      case 'invoice':
        return {
          subject: `Invoice - Order #${orderId || 'N/A'}`,
          content: `Dear ${customerName},

Please find your invoice below:

Invoice Number: ${orderId || 'N/A'}
Invoice Date: ${order ? new Date(order.createdAtIso).toLocaleDateString() : new Date().toLocaleDateString()}
Amount Due: $${order?.total.toFixed(2) || '0.00'}

Payment is due within 30 days of the invoice date.

If you have any questions about this invoice, please contact us.

Best regards,
${companyName} Team`
        }
      case 'contract':
        return {
          subject: `Contract Document - ${companyName}`,
          content: `Dear ${customerName},

Please find the contract document attached.

This contract outlines the terms and conditions of our agreement.

If you have any questions or need clarification on any terms, please don't hesitate to contact us.

Best regards,
${companyName} Team`
        }
      default:
        return {
          subject: `Document from ${companyName}`,
          content: `Dear ${customerName},

Please find the requested document attached.

If you have any questions, please contact us.

Best regards,
${companyName} Team`
        }
    }
  }

  // 빈 인보이스 템플릿 생성 함수
  const createBlankInvoice = () => {
    if (!defaultTemplate) return null
    
    const year = new Date().getFullYear()
    const invoiceNumber = `SP-${year}-${String(Date.now()).slice(-3).padStart(3, '0')}`
    const issueDate = new Date().toISOString().split('T')[0]
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    return {
      company: defaultTemplate.company,
      billing: {
        name: '',
        email: '',
        phone: '',
        address: ''
      },
      invoiceMeta: {
        invoiceNumber,
        issueDate,
        dueDate,
        reference: ''
      },
      items: [
        { description: 'Item 1', qty: 1, unitPrice: 0, taxRate: 0.1 }
      ],
      totals: {
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: 'AUD'
      },
      discounts: undefined,
      shipping: 0,
      paymentFee: undefined,
      payment: defaultTemplate.payment,
      notes: defaultTemplate.notes
    }
  }

  // 인보이스 데이터 생성 (주문 선택 시 또는 빈 인보이스 생성)
  useEffect(() => {
    if (selectedDocumentType === 'invoice' && defaultTemplate) {
      if (documentData.relatedOrderId) {
        // 주문 기반 인보이스 생성
        const order = orders.find(o => o.id === documentData.relatedOrderId)
        if (order) {
          const invoice = convertOrderToInvoice(order, defaultTemplate)
          setInvoiceData(invoice)
          setDocumentData(prev => ({
            ...prev,
            subject: `Invoice - ${invoice.invoiceMeta.invoiceNumber}`,
            content: `Dear ${order.customer.name},\n\nPlease find your invoice attached.\n\nInvoice Number: ${invoice.invoiceMeta.invoiceNumber}\nAmount Due: $${invoice.totals.total.toFixed(2)}\nDue Date: ${new Date(invoice.invoiceMeta.dueDate).toLocaleDateString()}\n\nPayment is due within 7 days of the invoice date.\n\nBest regards,\n${defaultTemplate?.company.name || COMPANY_LEGAL.companyName} Team`
          }))
        }
      } else {
        // 주문 없이 빈 인보이스 생성
        if (!invoiceData) {
          const blankInvoice = createBlankInvoice()
          if (blankInvoice) {
            setInvoiceData(blankInvoice)
            setDocumentData(prev => ({
              ...prev,
              subject: `Invoice - ${blankInvoice.invoiceMeta.invoiceNumber}`,
              content: `Dear Customer,\n\nPlease find your invoice attached.\n\nInvoice Number: ${blankInvoice.invoiceMeta.invoiceNumber}\nAmount Due: $${blankInvoice.totals.total.toFixed(2)}\nDue Date: ${new Date(blankInvoice.invoiceMeta.dueDate).toLocaleDateString()}\n\nPayment is due within 7 days of the invoice date.\n\nBest regards,\n${defaultTemplate?.company.name || COMPANY_LEGAL.companyName} Team`
            }))
          }
        }
      }
    } else if (selectedDocumentType !== 'invoice') {
      setInvoiceData(null)
    }
  }, [selectedDocumentType, documentData.relatedOrderId, orders, defaultTemplate])

  // Document Settings 탭을 떠날 때 templateEditData 초기화
  useEffect(() => {
    if (activeTab !== 'settings' && templateEditData) {
      setTemplateEditData(null)
    }
  }, [activeTab])

  // 인보이스 합계 자동 계산
  useEffect(() => {
    if (invoiceData && invoiceData.items) {
      const subtotal = invoiceData.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
      const tax = invoiceData.items.reduce(
        (sum, item) => sum + (item.taxRate ? item.unitPrice * item.qty * item.taxRate : 0),
        0
      )
      const total = subtotal + tax + (invoiceData.shipping || 0) + (invoiceData.paymentFee || 0) - (invoiceData.discounts?.totalDiscount || 0)
      
      // 합계가 변경된 경우에만 업데이트
      if (Math.abs(invoiceData.totals.subtotal - subtotal) > 0.01 || 
          Math.abs(invoiceData.totals.tax - tax) > 0.01 || 
          Math.abs(invoiceData.totals.total - total) > 0.01) {
        setInvoiceData(prev => prev ? {
          ...prev,
          totals: { ...prev.totals, subtotal, tax, total }
        } : null)
      }
    }
  }, [invoiceData?.items, invoiceData?.shipping, invoiceData?.paymentFee, invoiceData?.discounts?.totalDiscount])

  // 문서 유형 변경 시 내용 자동 생성 (인보이스 제외)
  // defaultTemplate이 변경되면 모든 Document Type의 내용이 자동으로 재생성됨
  useEffect(() => {
    if (selectedDocumentType === 'invoice') return // 인보이스는 위 useEffect에서 처리
    
    if (selectedDocumentType && documentData.relatedOrderId) {
      const content = generateDocumentContent(selectedDocumentType, documentData.relatedOrderId)
      setDocumentData(prev => ({
        ...prev,
        subject: content.subject,
        content: content.content
      }))
    } else if (selectedDocumentType) {
      const content = generateDocumentContent(selectedDocumentType)
      setDocumentData(prev => ({
        ...prev,
        subject: content.subject,
        content: content.content
      }))
    }
  }, [selectedDocumentType, documentData.relatedOrderId, defaultTemplate])

  // 인보이스 PDF 생성 함수
  const generateInvoicePDF = async (): Promise<File | null> => {
    if (!invoiceData || !invoiceRef.current) return null
    
    try {
      // 동적 import로 브라우저에서만 로드
      const html2pdf = (await import('html2pdf.js')).default
      
      // 전체 콘텐츠가 렌더링되도록 약간의 지연
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const element = invoiceRef.current
      const rect = element.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(element)
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0
      const marginTop = parseFloat(computedStyle.marginTop) || 0
      const marginBottom = parseFloat(computedStyle.marginBottom) || 0
      
      const totalHeight = element.scrollHeight + paddingTop + paddingBottom + marginTop + marginBottom
      const totalWidth = element.scrollWidth
      
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Invoice-${invoiceData.invoiceMeta.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          letterRendering: true,
          allowTaint: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: totalWidth,
          windowHeight: totalHeight,
          onclone: (clonedDoc: any) => {
            // 클론된 문서에서 모든 요소가 보이도록 스타일 조정
            try {
              if (clonedDoc && typeof clonedDoc.querySelector === 'function') {
                const clonedElement = clonedDoc.querySelector('[data-invoice-root]') as HTMLElement | null
                if (clonedElement && clonedElement.style) {
                  clonedElement.style.overflow = 'visible'
                  clonedElement.style.maxHeight = 'none'
                  clonedElement.style.height = 'auto'
                }
              }
            } catch (e) {
              // onclone 오류는 무시 (선택적 기능)
            }
          }
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'], before: '.page-break-before', after: '.page-break-after', avoid: ['.no-break'] }
      }
      
      const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob')
      const pdfFile = new File([pdfBlob], `Invoice-${invoiceData.invoiceMeta.invoiceNumber}.pdf`, { type: 'application/pdf' })
      return pdfFile
    } catch (error) {
      console.error('PDF generation error:', error)
      return null
    }
  }

  // 문서 발송 핸들러
  const handleSendDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedRecipients.length === 0) {
      setMessage('Please select at least one recipient.')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    if (!documentData.subject || !documentData.content) {
      setMessage('Please fill in all fields.')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setIsLoading(true)
    try {
      // 인보이스인 경우 PDF 생성
      let invoicePDF: File | null = null
      if (selectedDocumentType === 'invoice' && invoiceData) {
        invoicePDF = await generateInvoicePDF()
        if (invoicePDF) {
          setAttachedFiles(prev => [...prev, invoicePDF!])
        }
      }

      const results = await Promise.allSettled(
        selectedRecipients.map(async (email) => {
          const customer = allCustomers.find(c => c.email === email)
          const customerName = customer?.name || email.split('@')[0]
          
          const emailResponse = await emailService.sendResponse({
            customerEmail: email,
            customerName,
            subject: documentData.subject,
            message: documentData.content,
            adminName: adminUser?.username || defaultTemplate?.company.name || `${COMPANY_LEGAL.companyName} Admin`
          })

          // 인보이스인 경우 이력에 저장 (첫 번째 수신자에게만 저장하여 중복 방지)
          if (selectedDocumentType === 'invoice' && invoiceData && email === selectedRecipients[0]) {
            const invoiceId = `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            const invoiceRecord = {
              id: invoiceId,
              orderId: documentData.relatedOrderId || 'MANUAL', // 주문이 없으면 'MANUAL'로 표시
              invoiceNumber: invoiceData.invoiceMeta.invoiceNumber,
              customerEmail: email,
              invoiceData,
              createdAt: new Date().toISOString(),
              pdfUrl: invoicePDF ? URL.createObjectURL(invoicePDF) : undefined
            }
            console.log('💾 Saving invoice to store:', invoiceRecord)
            addGeneratedInvoice(invoiceRecord)
          }

          // 발송 이력 저장
          const attachmentUrl = attachedFiles.length > 0 
            ? attachedFiles.map(f => URL.createObjectURL(f)).join(',')
            : undefined

          const historyEntry: DocumentSendHistory = {
            id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            documentType: selectedDocumentType,
            recipientEmail: email,
            recipientName: customerName,
            subject: documentData.subject,
            content: documentData.content,
            sentAt: new Date().toISOString(),
            sentBy: adminUser?.username || 'Admin',
            status: emailResponse.success ? 'sent' : 'failed',
            relatedOrderId: documentData.relatedOrderId || undefined,
            attachmentUrl
          }
          
          setSendHistory(prev => [historyEntry, ...prev])
          
          return { email, success: emailResponse.success }
        })
      )

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
      const failedCount = results.length - successCount

      if (successCount > 0) {
        setMessage(`Documents sent successfully to ${successCount} recipient(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}${attachedFiles.length > 0 ? ` (${attachedFiles.length} file(s) attached)` : ''}.`)
        setIsSendModalOpen(false)
        setDocumentData({ subject: '', content: '', relatedOrderId: '' })
        setSelectedRecipients([])
        setAttachedFiles([])
        setInvoiceData(null)
        setActiveTab('history') // 발송 후 이력 탭으로 이동
      } else {
        setMessage('Failed to send documents. Please try again.')
      }
      
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      console.error('Document send error:', error)
      setMessage('Failed to send documents. Please try again.')
      setTimeout(() => setMessage(''), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  // 고객 선택 토글
  const toggleRecipient = (email: string) => {
    setSelectedRecipients(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    )
  }

  // 선택된 수신자 삭제
  const removeRecipient = React.useCallback((email: string) => {
    console.log('🔴 removeRecipient called with:', email)
    setSelectedRecipients(prev => {
      const filtered = prev.filter(e => e !== email)
      console.log('🔴 removeRecipient - prev:', prev, 'filtered:', filtered)
      return filtered
    })
  }, [])

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedRecipients.length === allCustomers.length) {
      setSelectedRecipients([])
    } else {
      setSelectedRecipients(allCustomers.map(c => c.email))
    }
  }

  // 필터링된 발송 이력
  const filteredHistory = sendHistory.filter(h => 
    filterType === 'all' || h.documentType === filterType
  ).sort((a, b) => 
    new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  )

  return (
    <AdminRoute requiredPermissions={['users:read']}>
      <div className="min-h-screen bg-gray-50">
        <AdminPageHeader
          title="Document Sender"
          icon={<FileText className="w-6 h-6" />}
          showBackButton={true}
          backUrl="/admin/dashboard"
          backLabel="Dashboard"
          showHomepageLink={false}
          showLanguageSelector={false}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Customers</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{allCustomers.length}</p>
                </div>
                <Users className="w-12 h-12 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Documents Sent</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{sendHistory.length}</p>
                </div>
                <FileText className="w-12 h-12 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-3xl font-bold text-indigo-600 mt-2">
                    {sendHistory.length > 0 
                      ? `${Math.round((sendHistory.filter(h => h.status === 'sent').length / sendHistory.length) * 100)}%`
                      : '0%'
                    }
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 text-indigo-500" />
              </div>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('send')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'send'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Send className="h-4 w-4" />
                  <span>Send Documents</span>
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'history'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <History className="h-4 w-4" />
                  <span>Send History ({sendHistory.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'invoices'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileCheck className="h-4 w-4" />
                  <span>Generated Invoices ({generatedInvoices.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('create')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'create'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Invoice & Quote</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('settings')
                    if (defaultTemplate) {
                      setTemplateEditData({
                        company: { ...defaultTemplate.company },
                        payment: { ...defaultTemplate.payment }
                      })
                    }
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'settings'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Document Settings</span>
                </button>
              </nav>
            </div>
          </div>

          {/* 메시지 */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('success') || message.includes('sent')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* 문서 발송 탭 */}
          {activeTab === 'send' && (
            <div className="space-y-6">
              {/* 문서 유형 선택 */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Type</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {(['order_confirmation', 'shipping_notification', 'receipt', 'invoice', 'contract', 'other'] as const).map((type) => {
                    const typeInfo = getDocumentTypeInfo(type)
                    const TypeIcon = typeInfo.icon
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedDocumentType(type)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedDocumentType === type
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <TypeIcon className={`w-6 h-6 mx-auto mb-2 ${
                          selectedDocumentType === type ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <p className={`text-sm font-medium ${
                          selectedDocumentType === type ? 'text-blue-900' : 'text-gray-700'
                        }`}>
                          {typeInfo.label}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 고객 선택 */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Select Recipients ({selectedRecipients.length} selected)
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={toggleSelectAll}
                      className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {selectedRecipients.length === allCustomers.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                      onClick={() => setIsSendModalOpen(true)}
                      disabled={selectedRecipients.length === 0}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send Document
                    </button>
                  </div>
                </div>

                {/* 선택된 수신자 목록 */}
                {selectedRecipients.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Selected Recipients ({selectedRecipients.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedRecipients.map((email, index) => {
                        const customer = allCustomers.find(c => c.email === email)
                        return (
                          <div
                            key={`recipient-${email}-${index}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm relative group"
                          >
                            <span className="font-medium">{customer?.name || email.split('@')[0]}</span>
                            <span className="text-blue-600">({email})</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('🔴 Button clicked - removing:', email)
                                setSelectedRecipients(prev => {
                                  const filtered = prev.filter((_, i) => i !== index)
                                  console.log('🔴 Filtered recipients:', filtered)
                                  return filtered
                                })
                              }}
                              className="ml-2 text-red-600 hover:text-red-800 hover:bg-red-100 active:bg-red-200 rounded-full p-2 transition-all flex items-center justify-center w-8 h-8 cursor-pointer z-50 relative flex-shrink-0 border border-red-300 hover:border-red-500"
                              title="Remove recipient"
                              aria-label={`Remove ${email}`}
                              style={{ pointerEvents: 'auto' }}
                            >
                              <X className="w-5 h-5" strokeWidth={2.5} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 검색 */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search customers by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 고객 목록 */}
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          <input
                            type="checkbox"
                            checked={selectedRecipients.length === allCustomers.length && allCustomers.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            No customers found.
                          </td>
                        </tr>
                      ) : (
                        allCustomers.map((customer) => (
                          <tr key={customer.email} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedRecipients.includes(customer.email)}
                                onChange={() => toggleRecipient(customer.email)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{customer.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{customer.email}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{customer.phone || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {customer.hasOrders ? (
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <CheckCircle className="w-4 h-4" />
                                  {customer.lastOrderDate}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 문서 미리보기 섹션 */}
              {((documentData.subject && documentData.content) || selectedDocumentType === 'receipt' || selectedDocumentType === 'shipping_notification' || (selectedDocumentType === 'invoice' && invoiceData)) && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Document Preview</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {getDocumentTypeInfo(selectedDocumentType).label}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Subject */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900">
                        {documentData.subject}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-gray-900 font-sans">
                          {documentData.content}
                        </pre>
                      </div>
                    </div>
                    
                    {/* Document Template Preview */}
                    {(() => {
                      const order = documentData.relatedOrderId ? orders.find(o => o.id === documentData.relatedOrderId) : null
                      
                      // Receipt Preview
                      if (selectedDocumentType === 'receipt') {
                        // 주문이 있으면 실제 주문 데이터 사용, 없으면 샘플 데이터 사용
                        const receiptOrder = order || {
                          id: 'SAMPLE-ORDER-001',
                          customer: {
                            name: 'Sample Customer',
                            firstName: 'Sample',
                            lastName: 'Customer',
                            email: 'customer@example.com',
                            phone: '0400 000 000'
                          },
                          address: {
                            streetAddress: '123 Sample Street',
                            suburb: 'Sample Suburb',
                            state: 'QLD',
                            postcode: '4000',
                            country: 'Australia'
                          },
                          items: [{
                            name: 'Sample Product',
                            price: 50.00,
                            image: '/placeholder-product.jpg',
                            quantity: 1,
                            customizations: {}
                          }],
                          subtotal: 50.00,
                          shippingPrice: 10.00,
                          total: 60.00,
                          vipDiscount: 0,
                          promoDiscount: 0,
                          discount: 0,
                          vipGradeName: undefined,
                          vipGradeCode: undefined,
                          promoCode: undefined,
                          paymentMethod: 'Credit Card',
                          shippingOptionName: 'Standard Shipping',
                          shippingOptionId: 'standard',
                          createdAtIso: new Date().toISOString()
                        }
                        
                        return (
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Receipt Preview
                              {!order && (
                                <span className="ml-2 text-xs text-gray-500 font-normal">
                                  (Sample - Select an order to see actual receipt)
                                </span>
                              )}
                            </label>
                            <div className="p-4 bg-white border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                              <OrderReceipt
                                order={{
                                  id: receiptOrder.id,
                                  customer: {
                                    name: receiptOrder.customer.name,
                                    firstName: receiptOrder.customer.firstName,
                                    lastName: receiptOrder.customer.lastName,
                                    email: receiptOrder.customer.email,
                                    phone: receiptOrder.customer.phone || ''
                                  },
                                  address: {
                                    streetAddress: receiptOrder.address.streetAddress,
                                    suburb: receiptOrder.address.suburb,
                                    state: receiptOrder.address.state,
                                    postcode: receiptOrder.address.postcode,
                                    country: receiptOrder.address.country
                                  },
                                  items: receiptOrder.items.map((item: any) => ({
                                    product: {
                                      name: item.name,
                                      price: item.price,
                                      image: item.image
                                    },
                                    quantity: item.quantity,
                                    customizations: item.customizations || {}
                                  })),
                                  subtotal: receiptOrder.subtotal,
                                  shipping: receiptOrder.shippingPrice,
                                  total: receiptOrder.total,
                                  vipDiscount: receiptOrder.vipDiscount,
                                  promoDiscount: receiptOrder.promoDiscount,
                                  discount: receiptOrder.discount,
                                  vipGradeName: receiptOrder.vipGradeName,
                                  vipGradeCode: receiptOrder.vipGradeCode,
                                  promoCode: receiptOrder.promoCode,
                                  paymentMethod: receiptOrder.paymentMethod,
                                  shippingOption: {
                                    name: receiptOrder.shippingOptionName || receiptOrder.shippingOptionId,
                                    price: receiptOrder.shippingPrice
                                  },
                                  createdAtIso: receiptOrder.createdAtIso
                                }}
                                language="en"
                              />
                            </div>
                          </div>
                        )
                      }
                      
                      // Shipping Notification Preview
                      if (selectedDocumentType === 'shipping_notification') {
                        // 주문이 있으면 실제 주문 데이터 사용, 없으면 샘플 데이터 사용
                        const shippingOrder = order || {
                          id: 'SAMPLE-ORDER-001',
                          customer: {
                            name: 'Sample Customer',
                            firstName: 'Sample',
                            lastName: 'Customer',
                            email: 'customer@example.com',
                            phone: '0400 000 000'
                          },
                          address: {
                            streetAddress: '123 Sample Street',
                            suburb: 'Sample Suburb',
                            state: 'QLD',
                            postcode: '4000',
                            country: 'Australia'
                          },
                          items: [{
                            product: {
                              name: 'Sample Product',
                              price: 50.00,
                              image: '/placeholder-product.jpg'
                            },
                            quantity: 1,
                            customizations: {}
                          }],
                          shippingOption: {
                            name: 'Standard Shipping',
                            price: 10.00
                          },
                          tracking: {
                            number: 'TRACK123456789',
                            provider: 'Australia Post',
                            status: 'in_transit' as const,
                            estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                            currentLocation: 'Sydney Distribution Center',
                            lastUpdate: new Date().toISOString(),
                            history: [{
                              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                              status: 'pending',
                              location: 'Warehouse',
                              description: 'Order processed and ready for shipment'
                            }, {
                              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                              status: 'in_transit',
                              location: 'Sydney Distribution Center',
                              description: 'Package in transit'
                            }]
                          },
                          createdAtIso: new Date().toISOString()
                        }
                        
                        return (
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Shipping Notification Preview
                              {!order && (
                                <span className="ml-2 text-xs text-gray-500 font-normal">
                                  (Sample - Select an order to see actual shipping notification)
                                </span>
                              )}
                            </label>
                            <div className="p-4 bg-white border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                              <ShippingNotificationTemplate
                                order={{
                                  id: shippingOrder.id,
                                  customer: {
                                    name: shippingOrder.customer.name,
                                    firstName: shippingOrder.customer.firstName,
                                    lastName: shippingOrder.customer.lastName,
                                    email: shippingOrder.customer.email,
                                    phone: shippingOrder.customer.phone || ''
                                  },
                                  address: {
                                    streetAddress: shippingOrder.address.streetAddress,
                                    suburb: shippingOrder.address.suburb,
                                    state: shippingOrder.address.state,
                                    postcode: shippingOrder.address.postcode,
                                    country: shippingOrder.address.country
                                  },
                                  items: shippingOrder.items.map((item: any) => ({
                                    product: {
                                      name: item.name || item.product?.name,
                                      price: item.price || item.product?.price,
                                      image: item.image || item.product?.image
                                    },
                                    quantity: item.quantity,
                                    customizations: item.customizations || {}
                                  })),
                                  shippingOption: shippingOrder.shippingOption,
                                  tracking: shippingOrder.tracking,
                                  createdAtIso: shippingOrder.createdAtIso
                                }}
                                company={defaultTemplate?.company}
                                language="en"
                              />
                            </div>
                          </div>
                        )
                      }
                      
                      // Invoice Preview
                      if (selectedDocumentType === 'invoice' && invoiceData) {
                        return (
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Preview</label>
                            <div className="p-4 bg-white border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                              <div ref={invoiceRef}>
                                <InvoiceTemplate
                                  company={invoiceData.company}
                                  billing={invoiceData.billing}
                                  invoiceMeta={invoiceData.invoiceMeta}
                                  items={invoiceData.items}
                                  totals={invoiceData.totals}
                                  discounts={invoiceData.discounts}
                                  shipping={invoiceData.shipping}
                                  paymentFee={invoiceData.paymentFee}
                                  payment={invoiceData.payment}
                                  notes={invoiceData.notes}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      }
                      
                      // Order Confirmation Preview
                      if (selectedDocumentType === 'order_confirmation') {
                        const confirmationOrder = order || {
                          id: 'SAMPLE-ORDER-001',
                          customer: {
                            name: 'Sample Customer',
                            firstName: 'Sample',
                            lastName: 'Customer',
                            email: 'customer@example.com',
                            phone: '0400 000 000'
                          },
                          items: [{
                            product: {
                              name: 'Sample Product',
                              price: 50.00,
                              image: '/placeholder-product.jpg'
                            },
                            quantity: 1,
                            customizations: {}
                          }],
                          subtotal: 50.00,
                          shipping: 10.00,
                          total: 60.00,
                          discount: 0,
                          createdAtIso: new Date().toISOString()
                        }
                        
                        return (
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Order Confirmation Preview
                              {!order && (
                                <span className="ml-2 text-xs text-gray-500 font-normal">
                                  (Sample - Select an order to see actual confirmation)
                                </span>
                              )}
                            </label>
                            <div className="p-4 bg-white border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                              <OrderConfirmationTemplate
                                order={{
                                  id: confirmationOrder.id,
                                  customer: {
                                    name: confirmationOrder.customer.name,
                                    firstName: confirmationOrder.customer.firstName,
                                    lastName: confirmationOrder.customer.lastName,
                                    email: confirmationOrder.customer.email,
                                    phone: confirmationOrder.customer.phone || ''
                                  },
                                  items: confirmationOrder.items.map((item: any) => ({
                                    product: {
                                      name: item.name || item.product?.name,
                                      price: item.price || item.product?.price,
                                      image: item.image || item.product?.image || '/placeholder-product.jpg'
                                    },
                                    quantity: item.quantity,
                                    customizations: item.customizations || {}
                                  })),
                                  subtotal: confirmationOrder.subtotal,
                                  shipping: confirmationOrder.shippingPrice || confirmationOrder.shipping || 0,
                                  total: confirmationOrder.total,
                                  discount: confirmationOrder.discount || 0,
                                  createdAtIso: confirmationOrder.createdAtIso
                                }}
                                company={defaultTemplate?.company}
                                template={(() => {
                                  const templateStore = useDocumentTemplateStore.getState()
                                  const template = templateStore.getTemplate('order_confirmation')
                                  return template ? {
                                    greeting: template.email.greeting,
                                    customMessage: template.content.customMessage,
                                    closing: template.email.closing
                                  } : undefined
                                })()}
                                language="en"
                              />
                            </div>
                          </div>
                        )
                      }
                      
                      // Shipping Notification, Contract, Other는 텍스트 기반이므로 Content 섹션에서 이미 표시됨
                      return null
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 발송 이력 탭 */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              {/* 필터 */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center gap-4">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Document Types</option>
                    <option value="order_confirmation">Order Confirmation</option>
                    <option value="shipping_notification">Shipping Notification</option>
                    <option value="receipt">Receipt</option>
                    <option value="invoice">Invoice</option>
                    <option value="contract">Contract</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* 발송 이력 목록 */}
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredHistory.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                            No document send history yet.
                          </td>
                        </tr>
                      ) : (
                        filteredHistory.map((history) => {
                          const typeInfo = getDocumentTypeInfo(history.documentType)
                          const TypeIcon = typeInfo.icon
                          return (
                            <tr key={history.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${typeInfo.color}`}>
                                  <TypeIcon className="w-3 h-3" />
                                  {typeInfo.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{history.recipientName}</div>
                                <div className="text-xs text-gray-500">{history.recipientEmail}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">{history.subject}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center text-sm text-gray-500">
                                  <Calendar className="w-4 h-4 mr-2" />
                                  {new Date(history.sentAt).toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">by {history.sentBy}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  history.status === 'sent'
                                    ? 'bg-green-100 text-green-800'
                                    : history.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {history.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete this document send history?\n\nType: ${typeInfo.label}\nRecipient: ${history.recipientName}\nSubject: ${history.subject}`)) {
                                      setSendHistory(prev => prev.filter(h => h.id !== history.id))
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-900 flex items-center gap-1"
                                  title="Delete"
                                >
                                  <X className="w-4 h-4" />
                                  Delete
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 생성된 인보이스 탭 */}
          {activeTab === 'invoices' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Invoices</h3>
                <p className="text-sm text-gray-600 mb-6">
                  View and manage all invoices that have been generated and sent to customers.
                </p>

                {/* 디버깅 정보 */}
                <div className="mb-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
                  <strong>Debug Info:</strong> Found {generatedInvoices.length} invoice(s) in store.
                  {generatedInvoices.length > 0 && (
                    <div className="mt-2">
                      Latest: {generatedInvoices[0]?.invoiceNumber} (Order: {generatedInvoices[0]?.orderId})
                    </div>
                  )}
                </div>

                {generatedInvoices.length === 0 ? (
                  <div className="text-center py-12">
                    <FileCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No invoices have been generated yet.</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Go to "Send Documents" tab and select "Invoice" to create your first invoice.
                    </p>
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left text-sm text-blue-800">
                      <p className="font-semibold mb-2">How to generate an invoice:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Go to "Send Documents" tab</li>
                        <li>Select "Invoice" as document type</li>
                        <li>Choose an order from the dropdown</li>
                        <li>Select a recipient</li>
                        <li>Click "Send" to generate and send the invoice</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice Number</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {generatedInvoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">#{invoice.orderId}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{invoice.customerEmail}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">
                                ${invoice.invoiceData.totals.total.toFixed(2)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {new Date(invoice.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(invoice.createdAt).toLocaleTimeString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedInvoice(selectedInvoice === invoice.id ? null : invoice.id)}
                                  className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                >
                                  <Eye className="w-4 h-4" />
                                  {selectedInvoice === invoice.id ? 'Hide' : 'View'}
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      // 미리보기를 먼저 표시하여 InvoiceTemplate이 렌더링되도록 함
                                      if (selectedInvoice !== invoice.id) {
                                        setSelectedInvoice(invoice.id)
                                        // 렌더링을 기다림
                                        await new Promise(resolve => setTimeout(resolve, 500))
                                      }
                                      
                                      const html2pdf = (await import('html2pdf.js')).default
                                      const previewElement = document.querySelector('[data-invoice-preview]') as HTMLElement
                                      
                                      if (!previewElement) {
                                        alert('Please click "View" first to render the invoice, then download PDF.')
                                        return
                                      }
                                      
                                      // 전체 콘텐츠가 렌더링되도록 약간의 지연
                                      await new Promise(resolve => setTimeout(resolve, 200))
                                      
                                      // 요소의 실제 전체 크기 계산
                                      const totalHeight = previewElement.scrollHeight
                                      const totalWidth = previewElement.scrollWidth
                                      
                                      // 요소를 뷰포트 상단으로 스크롤 (전체 내용이 보이도록)
                                      previewElement.scrollIntoView({ behavior: 'instant', block: 'start' })
                                      await new Promise(resolve => setTimeout(resolve, 100))
                                      
                                      const opt = {
                                        margin: [10, 10, 10, 10],
                                        filename: `${invoice.invoiceNumber}.pdf`,
                                        image: { type: 'jpeg', quality: 0.98 },
                                        html2canvas: { 
                                          scale: 2, 
                                          useCORS: true,
                                          logging: false,
                                          letterRendering: true,
                                          allowTaint: true,
                                          // 전체 요소를 캡처하기 위한 설정
                                          height: totalHeight,
                                          width: totalWidth,
                                          scrollX: 0,
                                          scrollY: 0,
                                          windowWidth: totalWidth,
                                          windowHeight: totalHeight,
                                          onclone: (clonedDoc: any) => {
                                            // 클론된 문서에서 모든 요소가 보이도록 스타일 조정
                                            try {
                                              if (clonedDoc && typeof clonedDoc.querySelector === 'function') {
                                                const clonedElement = clonedDoc.querySelector('[data-invoice-preview]') as HTMLElement | null
                                                if (clonedElement && clonedElement.style) {
                                                  clonedElement.style.overflow = 'visible'
                                                  clonedElement.style.maxHeight = 'none'
                                                  clonedElement.style.height = 'auto'
                                                  clonedElement.style.position = 'relative'
                                                  clonedElement.style.top = '0'
                                                  clonedElement.style.left = '0'
                                                  clonedElement.style.display = 'block'
                                                }
                                                // body와 html도 스타일 조정하여 전체 내용이 보이도록
                                                if (clonedDoc.body) {
                                                  clonedDoc.body.style.overflow = 'visible'
                                                  clonedDoc.body.style.height = 'auto'
                                                  clonedDoc.body.style.maxHeight = 'none'
                                                }
                                                if (clonedDoc.documentElement) {
                                                  clonedDoc.documentElement.style.overflow = 'visible'
                                                  clonedDoc.documentElement.style.height = 'auto'
                                                  clonedDoc.documentElement.style.maxHeight = 'none'
                                                }
                                              }
                                            } catch (e) {
                                              // onclone 오류는 무시 (선택적 기능)
                                              console.warn('onclone error:', e)
                                            }
                                          }
                                        },
                                        jsPDF: { 
                                          unit: 'mm', 
                                          format: 'a4', 
                                          orientation: 'portrait',
                                          compress: true
                                        },
                                        pagebreak: { mode: ['avoid-all', 'css', 'legacy'], before: '.page-break-before', after: '.page-break-after', avoid: ['.no-break'] }
                                      }
                                      
                                      const pdfBlob = await html2pdf().set(opt).from(previewElement).outputPdf('blob')
                                      const url = URL.createObjectURL(pdfBlob)
                                      const a = document.createElement('a')
                                      a.href = url
                                      a.download = `${invoice.invoiceNumber}.pdf`
                                      a.click()
                                      URL.revokeObjectURL(url)
                                    } catch (error) {
                                      console.error('PDF download error:', error)
                                      alert('Failed to download PDF. Please try again.')
                                    }
                                  }}
                                  className="text-green-600 hover:text-green-900 flex items-center gap-1"
                                >
                                  <Download className="w-4 h-4" />
                                  PDF
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete this invoice?\n\nInvoice Number: ${invoice.invoiceNumber}\nOrder ID: ${invoice.orderId}\nCustomer: ${invoice.customerEmail}\nAmount: $${invoice.invoiceData.totals.total.toFixed(2)}`)) {
                                      deleteGeneratedInvoice(invoice.id)
                                      if (selectedInvoice === invoice.id) {
                                        setSelectedInvoice(null)
                                      }
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-900 flex items-center gap-1"
                                  title="Delete"
                                >
                                  <X className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 선택된 인보이스 미리보기 */}
                {selectedInvoice && (
                  <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">Invoice Preview</h4>
                      <button
                        onClick={() => setSelectedInvoice(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    {(() => {
                      const invoice = generatedInvoices.find(inv => inv.id === selectedInvoice)
                      if (!invoice) return null
                      return (
                        <div className="bg-white rounded border border-gray-200 p-4" data-invoice-preview style={{ overflow: 'visible' }}>
                          <InvoiceTemplate
                            company={invoice.invoiceData.company}
                            billing={invoice.invoiceData.billing}
                            invoiceMeta={invoice.invoiceData.invoiceMeta}
                            items={invoice.invoiceData.items}
                            totals={invoice.invoiceData.totals}
                            discounts={invoice.invoiceData.discounts}
                            shipping={invoice.invoiceData.shipping}
                            paymentFee={invoice.invoiceData.paymentFee}
                            payment={invoice.invoiceData.payment}
                            notes={invoice.invoiceData.notes}
                          />
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 문서 발송 모달 */}
        {isSendModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Send Document</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {getDocumentTypeInfo(selectedDocumentType).label} to {selectedRecipients.length} recipient(s)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsSendModalOpen(false)
                      setAttachedFiles([])
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSendDocument} className="p-6">
                {/* 주문 ID 입력 (주문 관련 문서인 경우) */}
                {(selectedDocumentType === 'order_confirmation' || 
                  selectedDocumentType === 'shipping_notification' || 
                  selectedDocumentType === 'receipt' || 
                  selectedDocumentType === 'invoice') && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Order ID {selectedDocumentType === 'invoice' ? '(Required for Invoice)' : '(Optional)'}
                    </label>
                    {/* 주문 검색 */}
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search orders by ID, customer name, or email..."
                        value={orderSearchTerm}
                        onChange={(e) => setOrderSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    {/* 필터링된 주문 목록 */}
                    {(() => {
                      // 최근 주문 우선 정렬 (최신순)
                      const sortedOrders = [...orders].sort((a, b) => 
                        new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime()
                      )
                      
                      // 검색어로 필터링
                      const filteredOrders = sortedOrders.filter(order => {
                        if (!orderSearchTerm) return true
                        const searchLower = orderSearchTerm.toLowerCase()
                        return (
                          order.id.toLowerCase().includes(searchLower) ||
                          order.customer.name.toLowerCase().includes(searchLower) ||
                          order.customer.email.toLowerCase().includes(searchLower) ||
                          order.total.toFixed(2).includes(searchLower)
                        )
                      })
                      
                      return (
                        <select
                          value={documentData.relatedOrderId}
                          onChange={(e) => {
                            setDocumentData({ ...documentData, relatedOrderId: e.target.value })
                            setOrderSearchTerm('') // 선택 후 검색어 초기화
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          size={filteredOrders.length > 10 ? 10 : filteredOrders.length + 1}
                        >
                          <option value="">Select an order (optional - leave blank for manual invoice)...</option>
                          {filteredOrders.length === 0 ? (
                            <option value="" disabled>No orders found matching your search.</option>
                          ) : (
                            filteredOrders.map(order => (
                              <option key={order.id} value={order.id}>
                                Order #{order.id.slice(-8)} - {order.customer.name} ({order.customer.email}) - ${order.total.toFixed(2)} - {new Date(order.createdAtIso).toLocaleDateString()}
                              </option>
                            ))
                          )}
                        </select>
                      )
                    })()}
                    {orderSearchTerm && (
                      <p className="mt-1 text-xs text-gray-500">
                        Showing {orders.filter(o => {
                          const searchLower = orderSearchTerm.toLowerCase()
                          return (
                            o.id.toLowerCase().includes(searchLower) ||
                            o.customer.name.toLowerCase().includes(searchLower) ||
                            o.customer.email.toLowerCase().includes(searchLower) ||
                            o.total.toFixed(2).includes(searchLower)
                          )
                        }).length} of {orders.length} orders
                      </p>
                    )}
                  </div>
                )}

                {/* 인보이스 편집 UI */}
                {selectedDocumentType === 'invoice' && invoiceData && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <FileCheck className="w-4 h-4" />
                        Invoice Preview & Edit
                      </h4>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowInvoicePreview(!showInvoicePreview)}
                          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          {showInvoicePreview ? 'Hide Preview' : 'Show Preview'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const pdf = await generateInvoicePDF()
                            if (pdf) {
                              const url = URL.createObjectURL(pdf)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = pdf.name
                              a.click()
                              URL.revokeObjectURL(url)
                            }
                          }}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download PDF
                        </button>
                      </div>
                    </div>
                    
                    {showInvoicePreview && (
                      <div className="mb-4 p-4 bg-white rounded border border-gray-200 max-h-96 overflow-y-auto">
                        <div ref={invoiceRef}>
                          <InvoiceTemplate
                            company={invoiceData.company}
                            billing={invoiceData.billing}
                            invoiceMeta={invoiceData.invoiceMeta}
                            items={invoiceData.items}
                            totals={invoiceData.totals}
                            discounts={invoiceData.discounts}
                            shipping={invoiceData.shipping}
                            paymentFee={invoiceData.paymentFee}
                            payment={invoiceData.payment}
                            notes={invoiceData.notes}
                          />
                        </div>
                      </div>
                    )}

                    {/* 인보이스 메타 정보 */}
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Number</label>
                        <input
                          type="text"
                          value={invoiceData.invoiceMeta.invoiceNumber}
                          onChange={(e) => setInvoiceData(prev => prev ? {
                            ...prev,
                            invoiceMeta: { ...prev.invoiceMeta, invoiceNumber: e.target.value }
                          } : null)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                        <input
                          type="date"
                          value={invoiceData.invoiceMeta.dueDate}
                          onChange={(e) => setInvoiceData(prev => prev ? {
                            ...prev,
                            invoiceMeta: { ...prev.invoiceMeta, dueDate: e.target.value }
                          } : null)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Reference (Optional)</label>
                        <input
                          type="text"
                          value={invoiceData.invoiceMeta.reference || ''}
                          onChange={(e) => setInvoiceData(prev => prev ? {
                            ...prev,
                            invoiceMeta: { ...prev.invoiceMeta, reference: e.target.value }
                          } : null)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          placeholder="Order reference or note"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Issue Date</label>
                        <input
                          type="date"
                          value={invoiceData.invoiceMeta.issueDate}
                          onChange={(e) => setInvoiceData(prev => prev ? {
                            ...prev,
                            invoiceMeta: { ...prev.invoiceMeta, issueDate: e.target.value }
                          } : null)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                    </div>

                    {/* 고객 정보 편집 */}
                    <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                      <h5 className="text-xs font-semibold text-gray-700 mb-2">Customer Information</h5>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                          <input
                            type="text"
                            value={invoiceData.billing.name}
                            onChange={(e) => setInvoiceData(prev => prev ? {
                              ...prev,
                              billing: { ...prev.billing, name: e.target.value }
                            } : null)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                          <input
                            type="email"
                            value={invoiceData.billing.email || ''}
                            onChange={(e) => setInvoiceData(prev => prev ? {
                              ...prev,
                              billing: { ...prev.billing, email: e.target.value }
                            } : null)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                          <input
                            type="text"
                            value={invoiceData.billing.phone || ''}
                            onChange={(e) => setInvoiceData(prev => prev ? {
                              ...prev,
                              billing: { ...prev.billing, phone: e.target.value }
                            } : null)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                          <textarea
                            value={invoiceData.billing.address || ''}
                            onChange={(e) => setInvoiceData(prev => prev ? {
                              ...prev,
                              billing: { ...prev.billing, address: e.target.value }
                            } : null)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 품목 편집 */}
                    <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xs font-semibold text-gray-700">Invoice Items</h5>
                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceData(prev => prev ? {
                              ...prev,
                              items: [...prev.items, { description: 'New Item', qty: 1, unitPrice: 0, taxRate: 0.1 }]
                            } : null)
                          }}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Item
                        </button>
                      </div>
                      <div className="space-y-2">
                        {invoiceData.items.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-end text-xs">
                            <div className="col-span-4">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => {
                                  const newItems = [...invoiceData.items]
                                  newItems[index] = { ...item, description: e.target.value }
                                  setInvoiceData(prev => prev ? { ...prev, items: newItems } : null)
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => {
                                  const newItems = [...invoiceData.items]
                                  newItems[index] = { ...item, qty: parseFloat(e.target.value) || 0 }
                                  setInvoiceData(prev => prev ? { ...prev, items: newItems } : null)
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price</label>
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const newItems = [...invoiceData.items]
                                  newItems[index] = { ...item, unitPrice: parseFloat(e.target.value) || 0 }
                                  setInvoiceData(prev => prev ? { ...prev, items: newItems } : null)
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Tax Rate</label>
                              <input
                                type="number"
                                value={item.taxRate || 0}
                                onChange={(e) => {
                                  const newItems = [...invoiceData.items]
                                  newItems[index] = { ...item, taxRate: parseFloat(e.target.value) || 0 }
                                  setInvoiceData(prev => prev ? { ...prev, items: newItems } : null)
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                min="0"
                                max="1"
                                step="0.01"
                              />
                            </div>
                            <div className="col-span-2 flex items-end">
                              <button
                                type="button"
                                onClick={() => {
                                  const newItems = invoiceData.items.filter((_, i) => i !== index)
                                  setInvoiceData(prev => prev ? { ...prev, items: newItems } : null)
                                }}
                                className="w-full px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 합계 자동 계산 및 표시 */}
                    {(() => {
                      const subtotal = invoiceData.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
                      const tax = invoiceData.items.reduce(
                        (sum, item) => sum + (item.taxRate ? item.unitPrice * item.qty * item.taxRate : 0),
                        0
                      )
                      const total = subtotal + tax + (invoiceData.shipping || 0) + (invoiceData.paymentFee || 0) - (invoiceData.discounts?.totalDiscount || 0)
                      
                      // 합계 업데이트
                      if (invoiceData.totals.subtotal !== subtotal || invoiceData.totals.tax !== tax || invoiceData.totals.total !== total) {
                        setTimeout(() => {
                          setInvoiceData(prev => prev ? {
                            ...prev,
                            totals: { ...prev.totals, subtotal, tax, total }
                          } : null)
                        }, 0)
                      }
                      
                      return (
                        <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                          <h5 className="text-xs font-semibold text-gray-700 mb-2">Summary</h5>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tax (GST):</span>
                              <span>${tax.toFixed(2)}</span>
                            </div>
                            {invoiceData.shipping !== undefined && invoiceData.shipping > 0 && (
                              <div className="flex justify-between">
                                <span>Shipping:</span>
                                <span>${invoiceData.shipping.toFixed(2)}</span>
                              </div>
                            )}
                            {invoiceData.paymentFee !== undefined && invoiceData.paymentFee > 0 && (
                              <div className="flex justify-between">
                                <span>Payment Fee:</span>
                                <span>${invoiceData.paymentFee.toFixed(2)}</span>
                              </div>
                            )}
                            {invoiceData.discounts?.totalDiscount && invoiceData.discounts.totalDiscount > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Discount:</span>
                                <span>-${invoiceData.discounts.totalDiscount.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold border-t border-gray-300 pt-1">
                              <span>Total:</span>
                              <span>${total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      Note: Invoice PDF will be automatically attached when sending. You can edit all invoice details above.
                    </p>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={documentData.subject}
                    onChange={(e) => setDocumentData({ ...documentData, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    value={documentData.content}
                    onChange={(e) => setDocumentData({ ...documentData, content: e.target.value })}
                    rows={12}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* 파일 첨부 섹션 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Attachments (Optional)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      id="document-file-attachment"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          const newFiles = Array.from(e.target.files)
                          setAttachedFiles(prev => [...prev, ...newFiles])
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="document-file-attachment"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Files
                    </label>
                    
                    {attachedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {attachedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <span className="text-sm text-gray-700 truncate" title={file.name}>
                                {file.name}
                              </span>
                              <span className="text-xs text-gray-500 flex-shrink-0">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                              className="ml-2 text-red-600 hover:text-red-800 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSendModalOpen(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send to {selectedRecipients.length} recipient(s)
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Document Settings Tab */}
        {/* Create Invoice & Quote Tab */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            {/* 헤더 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Create & Send Document</h2>
                  <p className="text-gray-600 mt-1">Create and send invoices or quotes to customers</p>
                </div>
              </div>
              {/* 문서 타입 선택 */}
              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => setCreateDocumentType('invoice')}
                  className={`px-6 py-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                    createDocumentType === 'invoice'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <Receipt className="w-5 h-5" />
                  <span className="font-semibold">Invoice</span>
                </button>
                <button
                  onClick={() => setCreateDocumentType('quote')}
                  className={`px-6 py-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                    createDocumentType === 'quote'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span className="font-semibold">Quote</span>
                </button>
              </div>
              {/* 비즈니스 유형 (스티커 vs 청소) – 통합 관리 */}
              <div className="flex gap-4 mt-4 flex-wrap">
                <span className="text-sm font-medium text-gray-700 self-center">Business:</span>
                <button
                  onClick={() => {
                    setCreateDocumentCategory('sticker')
                    const base = getDefaultCreateInvoiceData('sticker')
                    // Sticker 문서에서는 현장(Service) 주소가 필요 없으므로 값도 함께 초기화
                    setCreateInvoiceData(prev => ({ ...prev, items: base.items, notes: base.notes, billing: { ...prev.billing, serviceAddress: '', serviceDate: '' } }))
                    setCreateQuoteData(prev => ({ ...prev, items: base.items, notes: base.notes, billing: { ...prev.billing, serviceAddress: '', serviceDate: '' } }))
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                    createDocumentCategory === 'sticker'
                      ? 'border-green-600 bg-green-50 text-green-800'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span className="font-medium">Sticker</span>
                </button>
                <button
                  onClick={() => {
                    setCreateDocumentCategory('cleaning')
                    const base = getDefaultCreateInvoiceData('cleaning')
                    setCreateInvoiceData(prev => ({ ...prev, items: base.items, notes: base.notes }))
                    setCreateQuoteData(prev => ({ ...prev, items: base.items, notes: base.notes }))
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                    createDocumentCategory === 'cleaning'
                      ? 'border-green-600 bg-green-50 text-green-800'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span className="font-medium">Cleaning</span>
                </button>
              </div>
            </div>

            {/* 편집 폼 및 미리보기 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 편집 폼 */}
              {showCreateEditForm && (
                <div className="space-y-6 lg:col-span-2">
                  {/* Step 1: 회사 정보 – 필요 시에만 펼쳐서 편집 */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <button
                      type="button"
                      onClick={() => setShowStep1CompanyInfo(!showStep1CompanyInfo)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Step 1 – Company Information</h3>
                        <p className="text-xs text-gray-500 mt-1">Update your business details shown on the invoice or quote. Click to {showStep1CompanyInfo ? 'collapse' : 'expand'}.</p>
                      </div>
                      {showStep1CompanyInfo ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                    </button>
                    {showStep1CompanyInfo && (
                    <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                        <input
                          type="text"
                          value={createDocumentType === 'invoice' ? createInvoiceData.company.name : createQuoteData.company.name}
                          onChange={e => {
                            if (createDocumentType === 'invoice') {
                              setCreateInvoiceData(prev => ({ ...prev, company: { ...prev.company, name: e.target.value } }))
                            } else {
                              setCreateQuoteData(prev => ({ ...prev, company: { ...prev.company, name: e.target.value } }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ABN</label>
                          <input
                            type="text"
                            value={createDocumentType === 'invoice' ? (createInvoiceData.company.abn || '') : (createQuoteData.company.abn || '')}
                            onChange={e => {
                              if (createDocumentType === 'invoice') {
                                setCreateInvoiceData(prev => ({ ...prev, company: { ...prev.company, abn: e.target.value } }))
                              } else {
                                setCreateQuoteData(prev => ({ ...prev, company: { ...prev.company, abn: e.target.value } }))
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ACN</label>
                          <input
                            type="text"
                            value={createDocumentType === 'invoice' ? (createInvoiceData.company.acn || '') : (createQuoteData.company.acn || '')}
                            onChange={e => {
                              if (createDocumentType === 'invoice') {
                                setCreateInvoiceData(prev => ({ ...prev, company: { ...prev.company, acn: e.target.value } }))
                              } else {
                                setCreateQuoteData(prev => ({ ...prev, company: { ...prev.company, acn: e.target.value } }))
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="text"
                            value={createDocumentType === 'invoice' ? (createInvoiceData.company.phone || '') : (createQuoteData.company.phone || '')}
                            onChange={e => {
                              if (createDocumentType === 'invoice') {
                                setCreateInvoiceData(prev => ({ ...prev, company: { ...prev.company, phone: e.target.value } }))
                              } else {
                                setCreateQuoteData(prev => ({ ...prev, company: { ...prev.company, phone: e.target.value } }))
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={createDocumentType === 'invoice' ? (createInvoiceData.company.email || '') : (createQuoteData.company.email || '')}
                          onChange={e => {
                            if (createDocumentType === 'invoice') {
                              setCreateInvoiceData(prev => ({ ...prev, company: { ...prev.company, email: e.target.value } }))
                            } else {
                              setCreateQuoteData(prev => ({ ...prev, company: { ...prev.company, email: e.target.value } }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <textarea
                          value={createDocumentType === 'invoice' ? (createInvoiceData.company.address || '') : (createQuoteData.company.address || '')}
                          onChange={e => {
                            if (createDocumentType === 'invoice') {
                              setCreateInvoiceData(prev => ({ ...prev, company: { ...prev.company, address: e.target.value } }))
                            } else {
                              setCreateQuoteData(prev => ({ ...prev, company: { ...prev.company, address: e.target.value } }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          rows={2}
                        />
                      </div>
                    </div>
                    )}
                  </div>

                  {/* Step 2: 청구 정보 */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <button
                      type="button"
                      onClick={() => setShowStep2BillingInfo(!showStep2BillingInfo)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Step 2 – {createDocumentType === 'invoice' ? 'Billing' : 'Quote To'} Information
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Enter the customer details the {createDocumentType === 'invoice' ? 'invoice' : 'quote'} will be issued to. Click to {showStep2BillingInfo ? 'collapse' : 'expand'}.
                        </p>
                      </div>
                      {showStep2BillingInfo ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                    </button>
                    {showStep2BillingInfo && (
                    <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
                      {/* 저장된 파트너/고객 프로필 선택 및 저장 */}
                      <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Saved Clients / Partners</label>
                            <select
                              value={selectedSavedClientId}
                              onChange={e => setSelectedSavedClientId(e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                            >
                              <option value="">Select saved client</option>
                              {savedClients.map(client => (
                                <option key={client.id} value={client.id}>
                                  {client.label} {client.category === 'cleaning' ? '(Cleaning)' : '(Sticker)'}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            disabled={!selectedSavedClientId}
                            onClick={() => {
                              const target = savedClients.find(c => c.id === selectedSavedClientId)
                              if (!target) return
                              const apply = (prevBilling: any) => ({
                                ...prevBilling,
                                ...target.billing
                              })
                              if (createDocumentType === 'invoice') {
                                setCreateInvoiceData(prev => ({
                                  ...prev,
                                  billing: apply(prev.billing)
                                }))
                              } else {
                                setCreateQuoteData(prev => ({
                                  ...prev,
                                  billing: apply(prev.billing)
                                }))
                              }
                              if (target.category) {
                                setCreateDocumentCategory(target.category)
                              }
                            }}
                            className="px-3 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Apply to Billing
                          </button>
                          {selectedSavedClientId && (
                            <button
                              type="button"
                              onClick={() => {
                                setSavedClients(prev => prev.filter(c => c.id !== selectedSavedClientId))
                                setSelectedSavedClientId('')
                              }}
                              className="px-3 py-2 text-xs sm:text-sm bg-red-50 text-red-600 border border-red-200 rounded-md"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Save current billing as new client</label>
                            <input
                              type="text"
                              value={newSavedClientLabel}
                              onChange={e => setNewSavedClientLabel(e.target.value)}
                              placeholder="e.g. Partner Cleaning Co. – Monthly"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const label = newSavedClientLabel.trim()
                              if (!label) return
                              const billing = createDocumentType === 'invoice'
                                ? createInvoiceData.billing
                                : createQuoteData.billing
                              const newClient: SavedClientProfile = {
                                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                                label,
                                category: createDocumentCategory,
                                billing: {
                                  companyName: billing.companyName,
                                  companyAbn: billing.companyAbn,
                                  serviceAddress: billing.serviceAddress,
                                  serviceDate: billing.serviceDate,
                                  name: billing.name,
                                  email: billing.email,
                                  phone: billing.phone,
                                  address: billing.address
                                }
                              }
                              setSavedClients(prev => [...prev, newClient])
                              setNewSavedClientLabel('')
                            }}
                            className="px-3 py-2 text-xs sm:text-sm bg-green-600 text-white rounded-md"
                          >
                            Save Client
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name (Optional)</label>
                        <input
                          type="text"
                          value={createDocumentType === 'invoice'
                            ? (createInvoiceData.billing.companyName || '')
                            : (createQuoteData.billing.companyName || '')}
                          onChange={e => {
                            if (createDocumentType === 'invoice') {
                              setCreateInvoiceData(prev => ({ ...prev, billing: { ...prev.billing, companyName: e.target.value } }))
                            } else {
                              setCreateQuoteData(prev => ({ ...prev, billing: { ...prev.billing, companyName: e.target.value } }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., ABC Pty Ltd"
                        />
                        <p className="text-xs text-gray-500 mt-1">Use this when issuing the invoice/quote to a business. The contact name below will appear as “Attn: …”.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company ABN (Optional)</label>
                        <input
                          type="text"
                          value={createDocumentType === 'invoice'
                            ? (createInvoiceData.billing.companyAbn || '')
                            : (createQuoteData.billing.companyAbn || '')}
                          onChange={e => {
                            if (createDocumentType === 'invoice') {
                              setCreateInvoiceData(prev => ({ ...prev, billing: { ...prev.billing, companyAbn: e.target.value } }))
                            } else {
                              setCreateQuoteData(prev => ({ ...prev, billing: { ...prev.billing, companyAbn: e.target.value } }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., 12 345 678 901"
                        />
                      </div>
                      {/* Customer Name field removed per request. */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={createDocumentType === 'invoice' ? (createInvoiceData.billing.email || '') : (createQuoteData.billing.email || '')}
                            onChange={e => {
                              if (createDocumentType === 'invoice') {
                                setCreateInvoiceData(prev => ({ ...prev, billing: { ...prev.billing, email: e.target.value } }))
                              } else {
                                setCreateQuoteData(prev => ({ ...prev, billing: { ...prev.billing, email: e.target.value } }))
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="text"
                            value={createDocumentType === 'invoice' ? (createInvoiceData.billing.phone || '') : (createQuoteData.billing.phone || '')}
                            onChange={e => {
                              if (createDocumentType === 'invoice') {
                                setCreateInvoiceData(prev => ({ ...prev, billing: { ...prev.billing, phone: e.target.value } }))
                              } else {
                                setCreateQuoteData(prev => ({ ...prev, billing: { ...prev.billing, phone: e.target.value } }))
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <textarea
                          value={createDocumentType === 'invoice' ? (createInvoiceData.billing.address || '') : (createQuoteData.billing.address || '')}
                          onChange={e => {
                            if (createDocumentType === 'invoice') {
                              setCreateInvoiceData(prev => ({ ...prev, billing: { ...prev.billing, address: e.target.value } }))
                            } else {
                              setCreateQuoteData(prev => ({ ...prev, billing: { ...prev.billing, address: e.target.value } }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          rows={2}
                        />
                      </div>
                      {createDocumentCategory === 'cleaning' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Service Address (Cleaning Site) (Optional)</label>
                          <textarea
                            value={createDocumentType === 'invoice'
                              ? (createInvoiceData.billing.serviceAddress || '')
                              : (createQuoteData.billing.serviceAddress || '')}
                            onChange={e => {
                              if (createDocumentType === 'invoice') {
                                setCreateInvoiceData(prev => ({ ...prev, billing: { ...prev.billing, serviceAddress: e.target.value } }))
                              } else {
                                setCreateQuoteData(prev => ({ ...prev, billing: { ...prev.billing, serviceAddress: e.target.value } }))
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            rows={2}
                            placeholder="Cleaning job location (if different from billing address)"
                          />
                        </div>
                      )}
                      {createDocumentCategory === 'cleaning' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Service Date (Optional)</label>
                          <input
                            type="date"
                            value={createDocumentType === 'invoice'
                              ? (createInvoiceData.billing.serviceDate || '')
                              : (createQuoteData.billing.serviceDate || '')}
                            onChange={e => {
                              if (createDocumentType === 'invoice') {
                                setCreateInvoiceData(prev => ({ ...prev, billing: { ...prev.billing, serviceDate: e.target.value } }))
                              } else {
                                setCreateQuoteData(prev => ({ ...prev, billing: { ...prev.billing, serviceDate: e.target.value } }))
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      )}
                    </div>
                    )}
                  </div>

                  {/* Step 3: 문서 메타 */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <button
                      type="button"
                      onClick={() => setShowStep3Details(!showStep3Details)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {createDocumentType === 'invoice' ? 'Step 3 – Invoice Details' : 'Step 3 – Quote Details'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {createDocumentType === 'invoice' ? 'Set the invoice number, dates, and reference.' : 'Set the quote number, dates, and reference.'} Click to {showStep3Details ? 'collapse' : 'expand'}.
                        </p>
                      </div>
                      {showStep3Details ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                    </button>
                    {showStep3Details && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                  {createDocumentType === 'invoice' ? (
                    <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                          <input
                            type="text"
                            value={createInvoiceData.invoiceMeta.invoiceNumber}
                            onChange={e => setCreateInvoiceData(prev => ({ ...prev, invoiceMeta: { ...prev.invoiceMeta, invoiceNumber: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                            <input
                              type="date"
                              value={createInvoiceData.invoiceMeta.issueDate}
                              onChange={e => setCreateInvoiceData(prev => ({ ...prev, invoiceMeta: { ...prev.invoiceMeta, issueDate: e.target.value } }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input
                              type="date"
                              value={createInvoiceData.invoiceMeta.dueDate || ''}
                              onChange={e => setCreateInvoiceData(prev => ({ ...prev, invoiceMeta: { ...prev.invoiceMeta, dueDate: e.target.value } }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                          <input
                            type="text"
                            value={createInvoiceData.invoiceMeta.reference || ''}
                            onChange={e => setCreateInvoiceData(prev => ({ ...prev, invoiceMeta: { ...prev.invoiceMeta, reference: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                  ) : (
                    <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Quote Number</label>
                          <input
                            type="text"
                            value={createQuoteData.quoteMeta.quoteNumber}
                            onChange={e => setCreateQuoteData(prev => ({ ...prev, quoteMeta: { ...prev.quoteMeta, quoteNumber: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                            <input
                              type="date"
                              value={createQuoteData.quoteMeta.issueDate}
                              onChange={e => setCreateQuoteData(prev => ({ ...prev, quoteMeta: { ...prev.quoteMeta, issueDate: e.target.value } }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                            <input
                              type="date"
                              value={createQuoteData.quoteMeta.validUntil || ''}
                              onChange={e => setCreateQuoteData(prev => ({ ...prev, quoteMeta: { ...prev.quoteMeta, validUntil: e.target.value } }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                          <input
                            type="text"
                            value={createQuoteData.quoteMeta.reference || ''}
                            onChange={e => setCreateQuoteData(prev => ({ ...prev, quoteMeta: { ...prev.quoteMeta, reference: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                  )}
                    </div>
                    )}
                  </div>

                  {/* Step 4: 품목 */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => setShowStep4LineItems(!showStep4LineItems)}
                        className="flex items-center justify-between flex-1 text-left"
                      >
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Step 4 – Line Items</h3>
                          <p className="text-xs text-gray-500 mt-1">Add and edit line items. Click to {showStep4LineItems ? 'collapse' : 'expand'}.</p>
                        </div>
                        {showStep4LineItems ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                      </button>
                    </div>
                    {showStep4LineItems && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            if (createDocumentType === 'invoice') {
                              setCreateInvoiceData(prev => ({
                                ...prev,
                                items: [...prev.items, { description: 'New Item', qty: 1, unitPrice: 0, taxRate: 0.1 }]
                              }))
                            } else {
                              setCreateQuoteData(prev => ({
                                ...prev,
                                items: [...prev.items, { description: 'New Item', qty: 1, unitPrice: 0, taxRate: 0.1 }]
                              }))
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                        >
                          <Plus size={16} />
                          Add Item
                        </button>
                      </div>
                    <div className="space-y-4">
                      {(createDocumentType === 'invoice' ? createInvoiceData.items : createQuoteData.items).map((item, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                            <button
                              onClick={() => {
                                if (createDocumentType === 'invoice') {
                                  setCreateInvoiceData(prev => ({
                                    ...prev,
                                    items: prev.items.filter((_, i) => i !== index)
                                  }))
                                } else {
                                  setCreateQuoteData(prev => ({
                                    ...prev,
                                    items: prev.items.filter((_, i) => i !== index)
                                  }))
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Description (줄바꿈 가능)</label>
                              <textarea
                                value={item.description}
                                onChange={e => {
                                  if (createDocumentType === 'invoice') {
                                    const newItems = [...createInvoiceData.items]
                                    newItems[index] = { ...item, description: e.target.value }
                                    setCreateInvoiceData(prev => ({ ...prev, items: newItems }))
                                  } else {
                                    const newItems = [...createQuoteData.items]
                                    newItems[index] = { ...item, description: e.target.value }
                                    setCreateQuoteData(prev => ({ ...prev, items: newItems }))
                                  }
                                }}
                                rows={3}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm resize-y"
                                placeholder="상품/서비스명 또는 상세 설명 (여러 줄 입력 가능)"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                              <input
                                type="number"
                                value={item.qty}
                                onChange={e => {
                                  if (createDocumentType === 'invoice') {
                                    const newItems = [...createInvoiceData.items]
                                    newItems[index] = { ...item, qty: Number(e.target.value) }
                                    setCreateInvoiceData(prev => ({ ...prev, items: newItems }))
                                  } else {
                                    const newItems = [...createQuoteData.items]
                                    newItems[index] = { ...item, qty: Number(e.target.value) }
                                    setCreateQuoteData(prev => ({ ...prev, items: newItems }))
                                  }
                                }}
                                min="0"
                                step="0.01"
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price</label>
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={e => {
                                  if (createDocumentType === 'invoice') {
                                    const newItems = [...createInvoiceData.items]
                                    newItems[index] = { ...item, unitPrice: Number(e.target.value) }
                                    setCreateInvoiceData(prev => ({ ...prev, items: newItems }))
                                  } else {
                                    const newItems = [...createQuoteData.items]
                                    newItems[index] = { ...item, unitPrice: Number(e.target.value) }
                                    setCreateQuoteData(prev => ({ ...prev, items: newItems }))
                                  }
                                }}
                                min="0"
                                step="0.01"
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">GST Rate</label>
                              <input
                                type="number"
                                value={item.taxRate}
                                onChange={e => {
                                  if (createDocumentType === 'invoice') {
                                    const newItems = [...createInvoiceData.items]
                                    newItems[index] = { ...item, taxRate: Number(e.target.value) }
                                    setCreateInvoiceData(prev => ({ ...prev, items: newItems }))
                                  } else {
                                    const newItems = [...createQuoteData.items]
                                    newItems[index] = { ...item, taxRate: Number(e.target.value) }
                                    setCreateQuoteData(prev => ({ ...prev, items: newItems }))
                                  }
                                }}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                                min="0"
                                max="1"
                                step="0.01"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                    )}
                  </div>

                  {/* Step 5: 할인 및 기타 */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <button
                      type="button"
                      onClick={() => setShowStep5Discounts(!showStep5Discounts)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Step 5 – Discounts & Fees</h3>
                        <p className="text-xs text-gray-500 mt-1">Apply VIP and promo discounts, shipping, and payment fees. Click to {showStep5Discounts ? 'collapse' : 'expand'}.</p>
                      </div>
                      {showStep5Discounts ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                    </button>
                    {showStep5Discounts && (
                    <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">VIP Discount (%)</label>
                          <input
                            type="number"
                            value={createDocumentType === 'invoice' 
                              ? (createInvoiceData.discounts?.vipDiscountPercent !== undefined && createInvoiceData.discounts?.vipDiscountPercent !== null ? createInvoiceData.discounts.vipDiscountPercent : '')
                              : (createQuoteData.discounts?.vipDiscountPercent !== undefined && createQuoteData.discounts?.vipDiscountPercent !== null ? createQuoteData.discounts.vipDiscountPercent : '')}
                            onChange={e => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value)
                              if (createDocumentType === 'invoice') {
                                setCreateInvoiceData(prev => ({
                                  ...prev,
                                  discounts: { ...prev.discounts, vipDiscountPercent: value }
                                }))
                              } else {
                                setCreateQuoteData(prev => ({
                                  ...prev,
                                  discounts: { ...prev.discounts, vipDiscountPercent: value }
                                }))
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Promo Discount (%)</label>
                          <input
                            type="number"
                            value={createDocumentType === 'invoice' 
                              ? (createInvoiceData.discounts?.promoDiscountPercent !== undefined && createInvoiceData.discounts?.promoDiscountPercent !== null ? createInvoiceData.discounts.promoDiscountPercent : '')
                              : (createQuoteData.discounts?.promoDiscountPercent !== undefined && createQuoteData.discounts?.promoDiscountPercent !== null ? createQuoteData.discounts.promoDiscountPercent : '')}
                            onChange={e => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value)
                              if (createDocumentType === 'invoice') {
                                setCreateInvoiceData(prev => ({
                                  ...prev,
                                  discounts: { ...prev.discounts, promoDiscountPercent: value }
                                }))
                              } else {
                                setCreateQuoteData(prev => ({
                                  ...prev,
                                  discounts: { ...prev.discounts, promoDiscountPercent: value }
                                }))
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code</label>
                        <input
                          type="text"
                          value={createDocumentType === 'invoice' ? (createInvoiceData.discounts?.promoCode || '') : (createQuoteData.discounts?.promoCode || '')}
                          onChange={e => {
                            if (createDocumentType === 'invoice') {
                              setCreateInvoiceData(prev => ({
                                ...prev,
                                discounts: { ...prev.discounts, promoCode: e.target.value }
                              }))
                            } else {
                              setCreateQuoteData(prev => ({
                                ...prev,
                                discounts: { ...prev.discounts, promoCode: e.target.value }
                              }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Optional"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Shipping</label>
                          <input
                            type="number"
                            value={createDocumentType === 'invoice' ? (createInvoiceData.shipping || 0) : (createQuoteData.shipping || 0)}
                            onChange={e => {
                              if (createDocumentType === 'invoice') {
                                setCreateInvoiceData(prev => ({ ...prev, shipping: Number(e.target.value) }))
                              } else {
                                setCreateQuoteData(prev => ({ ...prev, shipping: Number(e.target.value) }))
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Fee</label>
                          <input
                            type="number"
                            value={createDocumentType === 'invoice' ? (createInvoiceData.paymentFee || 0) : (createQuoteData.paymentFee || 0)}
                            onChange={e => {
                              if (createDocumentType === 'invoice') {
                                setCreateInvoiceData(prev => ({ ...prev, paymentFee: Number(e.target.value) }))
                              } else {
                                setCreateQuoteData(prev => ({ ...prev, paymentFee: Number(e.target.value) }))
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                </div>
              )}

              {/* 미리보기 */}
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Preview</h3>
                    <button
                      onClick={() => setShowCreateEditForm(!showCreateEditForm)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium text-gray-700 flex items-center gap-2"
                    >
                      {showCreateEditForm ? <Eye className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                      {showCreateEditForm ? 'Hide Form' : 'Show Form'}
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden" ref={createInvoiceRef} data-invoice-root>
                    {createDocumentType === 'invoice' ? (
                      <InvoiceTemplate
                        company={createInvoiceData.company}
                        billing={createInvoiceData.billing}
                        invoiceMeta={createInvoiceData.invoiceMeta}
                        items={createInvoiceData.items}
                        totals={createInvoiceData.totals}
                        discounts={createInvoiceData.discounts}
                        shipping={createInvoiceData.shipping}
                        paymentFee={createInvoiceData.paymentFee}
                        payment={createInvoiceData.payment}
                        notes={createInvoiceData.notes}
                      />
                    ) : (
                      <QuoteTemplate
                        company={createQuoteData.company}
                        billing={createQuoteData.billing}
                        quoteMeta={createQuoteData.quoteMeta}
                        items={createQuoteData.items}
                        totals={createQuoteData.totals}
                        discounts={createQuoteData.discounts}
                        shipping={createQuoteData.shipping}
                        paymentFee={createQuoteData.paymentFee}
                        payment={createQuoteData.payment}
                        notes={createQuoteData.notes}
                      />
                    )}
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email</label>
                      <input
                        type="email"
                        value={createRecipientEmail}
                        onChange={e => setCreateRecipientEmail(e.target.value)}
                        placeholder={createDocumentType === 'invoice' ? createInvoiceData.billing.email : createQuoteData.billing.email}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          if (!createInvoiceRef.current) return
                          setIsGeneratingCreatePDF(true)
                          try {
                            const html2pdf = (await import('html2pdf.js')).default
                            const element = createInvoiceRef.current
                            await new Promise(resolve => setTimeout(resolve, 200))
                            const totalHeight = element.scrollHeight
                            const totalWidth = element.scrollWidth
                            element.scrollIntoView({ behavior: 'instant', block: 'start' })
                            await new Promise(resolve => setTimeout(resolve, 100))
                            const currentData = createDocumentType === 'invoice' ? createInvoiceData : createQuoteData
                            const docNumber = createDocumentType === 'invoice' 
                              ? createInvoiceData.invoiceMeta.invoiceNumber 
                              : createQuoteData.quoteMeta.quoteNumber
                            const opt = {
                              margin: [10, 10, 10, 10] as [number, number, number, number],
                              filename: `${createDocumentType}-${docNumber}-${new Date().toISOString().split('T')[0]}.pdf`,
                              image: { type: 'jpeg' as const, quality: 0.98 },
                              html2canvas: { 
                                scale: 2, 
                                useCORS: true,
                                logging: false,
                                letterRendering: true,
                                allowTaint: true,
                                height: totalHeight,
                                width: totalWidth,
                                scrollX: 0,
                                scrollY: 0,
                                windowWidth: totalWidth,
                                windowHeight: totalHeight,
                                onclone: (clonedDoc: any) => {
                                  try {
                                    if (clonedDoc && typeof clonedDoc.querySelector === 'function') {
                                      const clonedElement = clonedDoc.querySelector('[data-invoice-root]') as HTMLElement | null
                                      if (clonedElement && clonedElement.style) {
                                        clonedElement.style.overflow = 'visible'
                                        clonedElement.style.maxHeight = 'none'
                                        clonedElement.style.height = 'auto'
                                        clonedElement.style.position = 'relative'
                                        clonedElement.style.top = '0'
                                        clonedElement.style.left = '0'
                                        clonedElement.style.display = 'block'
                                      }
                                      if (clonedDoc.body) {
                                        clonedDoc.body.style.overflow = 'visible'
                                        clonedDoc.body.style.height = 'auto'
                                        clonedDoc.body.style.maxHeight = 'none'
                                      }
                                      if (clonedDoc.documentElement) {
                                        clonedDoc.documentElement.style.overflow = 'visible'
                                        clonedDoc.documentElement.style.height = 'auto'
                                        clonedDoc.documentElement.style.maxHeight = 'none'
                                      }
                                    }
                                  } catch (e) {
                                    console.warn('onclone error:', e)
                                  }
                                }
                              },
                              jsPDF: { 
                                unit: 'mm' as const, 
                                format: 'a4' as const, 
                                orientation: 'portrait' as const,
                                compress: true
                              },
                              pagebreak: { mode: ['avoid-all', 'css', 'legacy'], before: '.page-break-before', after: '.page-break-after', avoid: ['.no-break'] }
                            }
                            await html2pdf().set(opt).from(element).save()
                          } catch (error) {
                            console.error('PDF generation failed:', error)
                            alert('Failed to generate PDF. Please try again.')
                          } finally {
                            setIsGeneratingCreatePDF(false)
                          }
                        }}
                        disabled={isGeneratingCreatePDF}
                        className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isGeneratingCreatePDF ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Download PDF
                          </>
                        )}
                      </button>
                      <button
                        onClick={async () => {
                          const currentData = createDocumentType === 'invoice' ? createInvoiceData : createQuoteData
                          const emailToSend = createRecipientEmail || currentData.billing.email
                          if (!emailToSend || !emailToSend.includes('@')) {
                            alert('Please enter a valid email address or set billing email.')
                            return
                          }

                          setIsSendingCreate(true)
                          try {
                            let pdfFile: File | null = null
                            if (createInvoiceRef.current) {
                              const html2pdf = (await import('html2pdf.js')).default
                              const element = createInvoiceRef.current
                              await new Promise(resolve => setTimeout(resolve, 200))
                              element.scrollIntoView({ behavior: 'instant', block: 'start' })
                              await new Promise(resolve => setTimeout(resolve, 100))
                              const totalHeight = element.scrollHeight
                              const totalWidth = element.scrollWidth
                              const docNumber = createDocumentType === 'invoice' 
                                ? createInvoiceData.invoiceMeta.invoiceNumber 
                                : createQuoteData.quoteMeta.quoteNumber
                              const opt = {
                                margin: [10, 10, 10, 10] as [number, number, number, number],
                                filename: `${createDocumentType}-${docNumber}.pdf`,
                                image: { type: 'jpeg' as const, quality: 0.98 },
                                html2canvas: { 
                                  scale: 2, 
                                  useCORS: true,
                                  logging: false,
                                  letterRendering: true,
                                  allowTaint: true,
                                  height: totalHeight,
                                  width: totalWidth,
                                  scrollX: 0,
                                  scrollY: 0,
                                  windowWidth: totalWidth,
                                  windowHeight: totalHeight,
                                  onclone: (clonedDoc: any) => {
                                    try {
                                      if (clonedDoc && typeof clonedDoc.querySelector === 'function') {
                                        const clonedElement = clonedDoc.querySelector('[data-invoice-root]') as HTMLElement | null
                                        if (clonedElement && clonedElement.style) {
                                          clonedElement.style.overflow = 'visible'
                                          clonedElement.style.maxHeight = 'none'
                                          clonedElement.style.height = 'auto'
                                        }
                                        if (clonedDoc.body) {
                                          clonedDoc.body.style.overflow = 'visible'
                                          clonedDoc.body.style.height = 'auto'
                                          clonedDoc.body.style.maxHeight = 'none'
                                        }
                                        if (clonedDoc.documentElement) {
                                          clonedDoc.documentElement.style.overflow = 'visible'
                                          clonedDoc.documentElement.style.height = 'auto'
                                          clonedDoc.documentElement.style.maxHeight = 'none'
                                        }
                                      }
                                    } catch (e) {
                                      console.warn('onclone error:', e)
                                    }
                                  }
                                },
                                jsPDF: { 
                                  unit: 'mm' as const, 
                                  format: 'a4' as const, 
                                  orientation: 'portrait' as const,
                                  compress: true
                                },
                                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                              }
                              const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob')
                              pdfFile = new File([pdfBlob], `${createDocumentType}-${docNumber}.pdf`, { type: 'application/pdf' })
                            }

                            const docNumber = createDocumentType === 'invoice' 
                              ? createInvoiceData.invoiceMeta.invoiceNumber 
                              : createQuoteData.quoteMeta.quoteNumber
                            const docTypeLabel = createDocumentType === 'invoice' ? 'invoice' : 'quote'
                            const companyName = defaultTemplate?.company.name || COMPANY_LEGAL.companyName
                            
                            const recipientDisplayName =
                              (currentData.billing.companyName || '').trim() ||
                              (currentData.billing.name || '').trim() ||
                              'Customer'

                            await emailService.sendResponse({
                              customerEmail: emailToSend,
                              customerName: recipientDisplayName,
                              subject: `${docTypeLabel.charAt(0).toUpperCase() + docTypeLabel.slice(1)} ${docNumber} from ${companyName}`,
                              message: `Dear ${recipientDisplayName},\n\nPlease find attached your ${docTypeLabel} ${docNumber}.\n\nThank you for your business!\n\n${companyName} Team`,
                              adminName: adminUser?.username || 'SELPIC Admin',
                              attachments: pdfFile ? [pdfFile] : undefined
                            })

                            // 생성된 Invoice를 저장
                            if (createDocumentType === 'invoice') {
                              addGeneratedInvoice({
                                id: `inv-${Date.now()}`,
                                invoiceNumber: createInvoiceData.invoiceMeta.invoiceNumber,
                                customerName:
                                  (createInvoiceData.billing.companyName || '').trim() ||
                                  (createInvoiceData.billing.name || '').trim() ||
                                  'Customer',
                                customerEmail: emailToSend,
                                total: createInvoiceData.totals.total,
                                issueDate: createInvoiceData.invoiceMeta.issueDate,
                                dueDate: createInvoiceData.invoiceMeta.dueDate,
                                status: 'sent',
                                createdAt: new Date().toISOString()
                              })
                            }

                            setMessage(`Success! ${docTypeLabel.charAt(0).toUpperCase() + docTypeLabel.slice(1)} sent to ${emailToSend}`)
                            setCreateRecipientEmail('')
                            setTimeout(() => setMessage(''), 5000)
                          } catch (error) {
                            console.error(`Failed to send ${createDocumentType}:`, error)
                            setMessage(`Failed to send ${createDocumentType}. Please try again.`)
                            setTimeout(() => setMessage(''), 5000)
                          } finally {
                            setIsSendingCreate(false)
                          }
                        }}
                        disabled={isSendingCreate}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSendingCreate ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send Email
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Document Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Document Settings</h2>
              <p className="text-gray-600 text-sm">Update company information and payment details. Changes will apply to all document types (Order Confirmation, Shipping Notification, Receipt, Invoice, Contract, Other).</p>
            </div>

            <div className="space-y-6">
              {templateEditData ? (
                <>
                  {/* Company Information */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Company Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                      <input
                        type="text"
                        value={templateEditData.company.name || ''}
                        onChange={e => setTemplateEditData(prev => prev ? {
                          ...prev,
                          company: { ...prev.company, name: e.target.value }
                        } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ABN</label>
                        <input
                          type="text"
                          value={templateEditData.company.abn || ''}
                          onChange={e => setTemplateEditData(prev => prev ? {
                            ...prev,
                            company: { ...prev.company, abn: e.target.value }
                          } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ACN</label>
                        <input
                          type="text"
                          value={templateEditData.company.acn || ''}
                          onChange={e => setTemplateEditData(prev => prev ? {
                            ...prev,
                            company: { ...prev.company, acn: e.target.value }
                          } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="text"
                          value={templateEditData.company.phone || ''}
                          onChange={e => setTemplateEditData(prev => prev ? {
                            ...prev,
                            company: { ...prev.company, phone: e.target.value }
                          } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={templateEditData.company.email || ''}
                        onChange={e => setTemplateEditData(prev => prev ? {
                          ...prev,
                          company: { ...prev.company, email: e.target.value }
                        } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={templateEditData.company.address || ''}
                        onChange={e => setTemplateEditData(prev => prev ? {
                          ...prev,
                          company: { ...prev.company, address: e.target.value }
                        } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Payment Details</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                        <input
                          type="text"
                          value={templateEditData.payment?.bank || ''}
                          onChange={e => setTemplateEditData(prev => prev ? {
                            ...prev,
                            payment: { ...prev.payment, bank: e.target.value }
                          } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Name (받는이)</label>
                        <input
                          type="text"
                          value={templateEditData.payment?.accountName || ''}
                          onChange={e => setTemplateEditData(prev => prev ? {
                            ...prev,
                            payment: { ...prev.payment, accountName: e.target.value }
                          } : null)}
                          placeholder="e.g. SELPIC PTY LTD"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">BSB</label>
                        <input
                          type="text"
                          value={templateEditData.payment?.bsb || ''}
                          onChange={e => setTemplateEditData(prev => prev ? {
                            ...prev,
                            payment: { ...prev.payment, bsb: e.target.value }
                          } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                        <input
                          type="text"
                          value={templateEditData.payment?.account || ''}
                          onChange={e => setTemplateEditData(prev => prev ? {
                            ...prev,
                            payment: { ...prev.payment, account: e.target.value }
                          } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Note</label>
                      <textarea
                        value={templateEditData.payment?.note || ''}
                        onChange={e => setTemplateEditData(prev => prev ? {
                          ...prev,
                          payment: { ...prev.payment, note: e.target.value }
                        } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setTemplateEditData(null)
                      setActiveTab('send')
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (templateEditData) {
                        // defaultTemplate이 있으면 업데이트
                        if (defaultTemplate) {
                          const updatedTemplate = {
                            ...defaultTemplate,
                            company: templateEditData.company,
                            payment: templateEditData.payment,
                            updatedAt: new Date().toISOString()
                          }
                          setDefaultTemplate(updatedTemplate)
                        }
                        
                        // 모든 Document Template의 company 정보도 업데이트
                        const allTypes: DocumentType[] = ['order_confirmation', 'receipt', 'invoice', 'shipping_notification', 'contract', 'other']
                        allTypes.forEach(type => {
                          const currentTemplate = documentTemplates.getTemplate(type)
                          if (currentTemplate) {
                            documentTemplates.updateTemplate(type, {
                              company: templateEditData.company
                            })
                          }
                        })
                        
                        // Invoice 템플릿의 payment 정보도 업데이트
                        const invoiceTemplate = documentTemplates.getTemplate('invoice')
                        if (invoiceTemplate && invoiceTemplate.type === 'invoice') {
                          documentTemplates.updateTemplate('invoice', {
                            payment: templateEditData.payment
                          })
                        }
                        
                        setMessage('Document template settings saved successfully! All document types will use the updated information.')
                        setTimeout(() => setMessage(''), 3000)
                        setTemplateEditData(null)
                        setActiveTab('send')
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
                </>
            ) : (
                /* Company & Payment Settings */
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Company & Payment Information</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Update company information and payment details. These settings apply to all document types.
                  </p>
                  <button
                    onClick={() => {
                      if (defaultTemplate) {
                        setTemplateEditData({
                          company: { ...defaultTemplate.company },
                          payment: { ...defaultTemplate.payment }
                        })
                      } else {
                        // defaultTemplate이 없으면 템플릿 스토어에서 가져오기
                        const invoiceTemplate = documentTemplates.getTemplate('invoice')
                        if (invoiceTemplate) {
                          setTemplateEditData({
                            company: { ...invoiceTemplate.company },
                            payment: invoiceTemplate.type === 'invoice' ? { ...invoiceTemplate.payment } : {
                              bank: '',
                              accountName: '',
                              bsb: '',
                              account: '',
                              note: ''
                            }
                          })
                        } else {
                          // 완전히 기본값 (ABN/ACN·연락처 단일 소스 반영)
                          setTemplateEditData({
                            company: {
                              name: COMPANY_LEGAL.companyName,
                              abn: COMPANY_LEGAL.abn,
                              acn: COMPANY_LEGAL.acn,
                              phone: COMPANY_CONTACT.phone,
                              email: COMPANY_CONTACT.email,
                              address: COMPANY_CONTACT.address,
                              logoUrl: COMPANY_LOGO_URL
                            },
                            payment: {
                              bank: '',
                              accountName: '',
                              bsb: '',
                              account: '',
                              note: ''
                            }
                          })
                        }
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit Company & Payment Info
                  </button>
                </div>
              )}

              {/* Document Templates Section - 항상 표시 */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Document Templates</h3>
                  <p className="text-sm text-gray-600">
                    Manage templates for automatic emails. Changes will apply to all future automatic emails sent to customers.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {/* Order Confirmation Template */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                        <h4 className="font-semibold text-gray-900">Order Confirmation</h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Sent automatically when a customer places an order
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingTemplateType('order_confirmation')
                            setTemplateEditModalOpen(true)
                          }}
                          className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Edit Template
                        </button>
                        <button
                          onClick={() => {
                            const template = documentTemplates.getTemplate('order_confirmation')
                            if (template) {
                              alert(`Order Confirmation Template\n\nSubject: ${template.email.subject}\n\nThis template will be used for automatic order confirmation emails.`)
                            }
                          }}
                          className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Receipt Template */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <Receipt className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold text-gray-900">Receipt</h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Sent automatically after payment is completed
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingTemplateType('receipt')
                            setTemplateEditModalOpen(true)
                          }}
                          className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Edit Template
                        </button>
                        <button
                          onClick={() => {
                            const template = documentTemplates.getTemplate('receipt')
                            if (template) {
                              alert(`Receipt Template\n\nSubject: ${template.email.subject}\n\nThis template will be used for automatic receipt emails.`)
                            }
                          }}
                          className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Invoice Template */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <FileCheck className="w-5 h-5 text-orange-600" />
                        <h4 className="font-semibold text-gray-900">Invoice</h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Used for invoice documents (manual and automatic)
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingTemplateType('invoice')
                            setTemplateEditModalOpen(true)
                          }}
                          className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Edit Template
                        </button>
                        <button
                          onClick={() => {
                            const template = documentTemplates.getTemplate('invoice')
                            if (template) {
                              alert(`Invoice Template\n\nSubject: ${template.email.subject}\n\nThis template will be used for invoice documents.`)
                            }
                          }}
                          className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Shipping Notification Template */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <Package className="w-5 h-5 text-green-600" />
                        <h4 className="font-semibold text-gray-900">Shipping Notification</h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Sent automatically when an order is shipped
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingTemplateType('shipping_notification')
                            setTemplateEditModalOpen(true)
                          }}
                          className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Edit Template
                        </button>
                        <button
                          onClick={() => {
                            const template = documentTemplates.getTemplate('shipping_notification')
                            if (template) {
                              alert(`Shipping Notification Template\n\nSubject: ${template.email.subject}\n\nThis template will be used for automatic shipping notification emails.`)
                            }
                          }}
                          className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Contract Template */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <h4 className="font-semibold text-gray-900">Contract</h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Used for contract documents
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingTemplateType('contract')
                            setTemplateEditModalOpen(true)
                          }}
                          className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Edit Template
                        </button>
                        <button
                          onClick={() => {
                            const template = documentTemplates.getTemplate('contract')
                            if (template) {
                              alert(`Contract Template\n\nSubject: ${template.email.subject}\n\nThis template will be used for contract documents.`)
                            }
                          }}
                          className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Other Document Template */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <FileIcon className="w-5 h-5 text-gray-600" />
                        <h4 className="font-semibold text-gray-900">Other Document</h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Used for other document types
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingTemplateType('other')
                            setTemplateEditModalOpen(true)
                          }}
                          className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Edit Template
                        </button>
                        <button
                          onClick={() => {
                            const template = documentTemplates.getTemplate('other')
                            if (template) {
                              alert(`Other Document Template\n\nSubject: ${template.email.subject}\n\nThis template will be used for other document types.`)
                            }
                          }}
                          className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* Document Template Edit Modal */}
        {templateEditModalOpen && editingTemplateType && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Edit {editingTemplateType === 'order_confirmation' ? 'Order Confirmation' :
                            editingTemplateType === 'receipt' ? 'Receipt' :
                            editingTemplateType === 'invoice' ? 'Invoice' :
                            editingTemplateType === 'shipping_notification' ? 'Shipping Notification' :
                            editingTemplateType === 'contract' ? 'Contract' : 'Other Document'} Template
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Changes will apply to all future automatic emails of this type.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setTemplateEditModalOpen(false)
                      setEditingTemplateType(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {(() => {
                  const template = documentTemplates.getTemplate(editingTemplateType)
                  if (!template) return <div>Loading...</div>

                  return (
                    <div className="space-y-6">
                      {/* Email Settings */}
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <h4 className="text-lg font-semibold mb-4 text-gray-800">Email Settings</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email Subject
                            </label>
                            <input
                              type="text"
                              value={template.email.subject}
                              onChange={e => {
                                documentTemplates.updateTemplate(editingTemplateType, {
                                  email: {
                                    ...template.email,
                                    subject: e.target.value
                                  }
                                })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="e.g., Order Confirmation - Order #{orderId}"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Use {'{orderId}'}, {'{customerName}'}, {'{companyName}'} as placeholders
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Greeting
                            </label>
                            <input
                              type="text"
                              value={template.email.greeting || ''}
                              onChange={e => {
                                documentTemplates.updateTemplate(editingTemplateType, {
                                  email: {
                                    ...template.email,
                                    greeting: e.target.value
                                  }
                                })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="e.g., Dear {customerName},"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Custom Message
                            </label>
                            <textarea
                              value={template.email.customMessage || ''}
                              onChange={e => {
                                documentTemplates.updateTemplate(editingTemplateType, {
                                  email: {
                                    ...template.email,
                                    customMessage: e.target.value
                                  }
                                })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              rows={4}
                              placeholder="Enter custom message that will appear in the email body..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Closing
                            </label>
                            <input
                              type="text"
                              value={template.email.closing || ''}
                              onChange={e => {
                                documentTemplates.updateTemplate(editingTemplateType, {
                                  email: {
                                    ...template.email,
                                    closing: e.target.value
                                  }
                                })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="e.g., Best regards,"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Template-specific Content */}
                      {template.type === 'order_confirmation' && (
                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                          <h4 className="text-lg font-semibold mb-4 text-gray-800">Content Settings</h4>
                          <div className="space-y-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={template.content.showOrderDetails}
                                onChange={e => {
                                  documentTemplates.updateTemplate(editingTemplateType, {
                                    content: {
                                      ...template.content,
                                      showOrderDetails: e.target.checked
                                    }
                                  })
                                }}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700">Show Order Details</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={template.content.showItems}
                                onChange={e => {
                                  documentTemplates.updateTemplate(editingTemplateType, {
                                    content: {
                                      ...template.content,
                                      showItems: e.target.checked
                                    }
                                  })
                                }}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700">Show Order Items</span>
                            </label>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Additional Message
                              </label>
                              <textarea
                                value={template.content.customMessage || ''}
                                onChange={e => {
                                  documentTemplates.updateTemplate(editingTemplateType, {
                                    content: {
                                      ...template.content,
                                      customMessage: e.target.value
                                    }
                                  })
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                rows={3}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {template.type === 'receipt' && (
                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                          <h4 className="text-lg font-semibold mb-4 text-gray-800">Content Settings</h4>
                          <div className="space-y-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={template.content.showPaymentMethod}
                                onChange={e => {
                                  documentTemplates.updateTemplate(editingTemplateType, {
                                    content: {
                                      ...template.content,
                                      showPaymentMethod: e.target.checked
                                    }
                                  })
                                }}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700">Show Payment Method</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={template.content.showItems}
                                onChange={e => {
                                  documentTemplates.updateTemplate(editingTemplateType, {
                                    content: {
                                      ...template.content,
                                      showItems: e.target.checked
                                    }
                                  })
                                }}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700">Show Order Items</span>
                            </label>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Additional Message
                              </label>
                              <textarea
                                value={template.content.customMessage || ''}
                                onChange={e => {
                                  documentTemplates.updateTemplate(editingTemplateType, {
                                    content: {
                                      ...template.content,
                                      customMessage: e.target.value
                                    }
                                  })
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                rows={3}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {template.type === 'invoice' && (
                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                          <h4 className="text-lg font-semibold mb-4 text-gray-800">Invoice Notes</h4>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Notes (appears at the bottom of invoice)
                            </label>
                            <textarea
                              value={template.content.notes || ''}
                              onChange={e => {
                                documentTemplates.updateTemplate(editingTemplateType, {
                                  content: {
                                    ...template.content,
                                    notes: e.target.value
                                  }
                                })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              rows={4}
                              placeholder="Enter notes that will appear at the bottom of the invoice..."
                            />
                          </div>
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Additional Message
                            </label>
                            <textarea
                              value={template.content.customMessage || ''}
                              onChange={e => {
                                documentTemplates.updateTemplate(editingTemplateType, {
                                  content: {
                                    ...template.content,
                                    customMessage: e.target.value
                                  }
                                })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              rows={3}
                            />
                          </div>
                        </div>
                      )}

                      {template.type === 'shipping_notification' && (
                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                          <h4 className="text-lg font-semibold mb-4 text-gray-800">Content Settings</h4>
                          <div className="space-y-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={template.content.showTrackingInfo}
                                onChange={e => {
                                  documentTemplates.updateTemplate(editingTemplateType, {
                                    content: {
                                      ...template.content,
                                      showTrackingInfo: e.target.checked
                                    }
                                  })
                                }}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700">Show Tracking Information</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={template.content.showEstimatedDelivery}
                                onChange={e => {
                                  documentTemplates.updateTemplate(editingTemplateType, {
                                    content: {
                                      ...template.content,
                                      showEstimatedDelivery: e.target.checked
                                    }
                                  })
                                }}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700">Show Estimated Delivery Date</span>
                            </label>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Additional Message
                              </label>
                              <textarea
                                value={template.content.customMessage || ''}
                                onChange={e => {
                                  documentTemplates.updateTemplate(editingTemplateType, {
                                    content: {
                                      ...template.content,
                                      customMessage: e.target.value
                                    }
                                  })
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                rows={3}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {template.type === 'contract' && (
                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                          <h4 className="text-lg font-semibold mb-4 text-gray-800">Contract Content</h4>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Contract Text
                            </label>
                            <textarea
                              value={template.content.contractText || ''}
                              onChange={e => {
                                documentTemplates.updateTemplate(editingTemplateType, {
                                  content: {
                                    ...template.content,
                                    contractText: e.target.value
                                  }
                                })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              rows={6}
                              placeholder="Enter contract text..."
                            />
                          </div>
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Additional Message
                            </label>
                            <textarea
                              value={template.content.customMessage || ''}
                              onChange={e => {
                                documentTemplates.updateTemplate(editingTemplateType, {
                                  content: {
                                    ...template.content,
                                    customMessage: e.target.value
                                  }
                                })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              rows={3}
                            />
                          </div>
                        </div>
                      )}

                      {template.type === 'other' && (
                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                          <h4 className="text-lg font-semibold mb-4 text-gray-800">Document Content</h4>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Document Text
                            </label>
                            <textarea
                              value={template.content.documentText || ''}
                              onChange={e => {
                                documentTemplates.updateTemplate(editingTemplateType, {
                                  content: {
                                    ...template.content,
                                    documentText: e.target.value
                                  }
                                })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              rows={6}
                              placeholder="Enter document text..."
                            />
                          </div>
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Additional Message
                            </label>
                            <textarea
                              value={template.content.customMessage || ''}
                              onChange={e => {
                                documentTemplates.updateTemplate(editingTemplateType, {
                                  content: {
                                    ...template.content,
                                    customMessage: e.target.value
                                  }
                                })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              rows={3}
                            />
                          </div>
                        </div>
                      )}

                      {/* Save & Cancel Buttons */}
                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setTemplateEditModalOpen(false)
                            setEditingTemplateType(null)
                          }}
                          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            setMessage(`Template saved successfully! This will be used for all future automatic ${editingTemplateType === 'order_confirmation' ? 'order confirmation' :
                              editingTemplateType === 'receipt' ? 'receipt' :
                              editingTemplateType === 'invoice' ? 'invoice' :
                              editingTemplateType === 'shipping_notification' ? 'shipping notification' :
                              editingTemplateType === 'contract' ? 'contract' : 'other document'} emails.`)
                            setTimeout(() => setMessage(''), 5000)
                            setTemplateEditModalOpen(false)
                            setEditingTemplateType(null)
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Save Template
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  )
}


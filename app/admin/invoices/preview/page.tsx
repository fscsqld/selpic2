'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import InvoiceTemplate, { InvoiceLineItem, InvoiceTemplateProps } from '@/components/invoice/InvoiceTemplate'
import QuoteTemplate, { QuoteTemplateProps } from '@/components/invoice/QuoteTemplate'
import { Download, Loader2, Send, Plus, Trash2, Edit2, Eye, FileText, Receipt, ChevronDown, ChevronUp, History } from 'lucide-react'
import { emailService } from '@/lib/emailService'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import InvoiceQuoteSendHistoryPanel from '@/components/admin/InvoiceQuoteSendHistoryPanel'
import { useAdminAuth } from '@/lib/adminAuth'
import { DocumentSendLog, useDocumentSendLogStore } from '@/lib/documentSendLogStore'
import {
  COMPANY_LEGAL,
  COMPANY_BANK,
  COMPANY_CONTACT,
  COMPANY_LOGO_URL,
  getCompanyBrandName
} from '@/lib/companyLegal'
import { formatCustomerDisplayName } from '@/lib/formatCustomerDisplayName'
import {
  getDefaultLineItemsByCategory,
  getDefaultNotesByCategory,
  getNewDocumentLineItem,
  CLEANING_SERVICE_OPTIONS,
  CLEANING_SERVICE_CUSTOM,
  resolveCleaningServiceSelectValue,
  getCleaningServiceExtraDetails,
  buildCleaningServiceDescription,
  MARKET_S_LINE_OPTIONS,
  MARKET_S_LINE_CUSTOM,
  DOCUMENT_SHIPPING_CUSTOM,
  resolveMarketSLineSelectValue,
  getMarketSLineExtraDetails,
  buildMarketSLineDescription,
  isMarketSSelectableProductLine,
  isDocumentShippingLine,
  listDocumentShippingOptionsForSelect,
  resolveDocumentShippingSelectValue,
  applyDocumentShippingOptionToLine,
  documentCategoryUsesShippingSelect,
  documentCategoryShowsShipping,
  documentCategoryShowsServiceSite,
  documentCategoryLabel,
  type DocumentBusinessCategory,
} from '@/lib/documentCreateDefaults'
import { computeDocumentCreateTotals } from '@/lib/documentCreateTotals'
import { useContentStore } from '@/lib/contentStore'

// 마운트 시점에 최신 COMPANY_LEGAL·COMPANY_CONTACT·COMPANY_BANK 반영 (Preview 화면에 올바른 값 표시)
function getDefaultInvoiceData(
  category: DocumentBusinessCategory = 'sticker'
): Omit<InvoiceTemplateProps, 'items' | 'totals'> & {
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
} {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const items = getDefaultLineItemsByCategory(category) as InvoiceLineItem[]
  const computed = computeDocumentCreateTotals({ items })
  return {
    company: {
      name: COMPANY_LEGAL.companyName,
      abn: COMPANY_LEGAL.abn,
      acn: COMPANY_LEGAL.acn,
      phone: COMPANY_CONTACT.phone,
      email: COMPANY_CONTACT.email,
      address: COMPANY_CONTACT.address,
      logoUrl: COMPANY_LOGO_URL
    },
    billing: {
      // 회사 청구용 필드 (Document Sender 화면과 동일한 구조)
      companyName: '',
      companyAbn: '',
      serviceAddress: '',
      serviceDate: '',
      // 공통 청구 필드 (name = 개인 고객 또는 회사 담당자; 회사명만 있어도 됨)
      name: '',
      email: '',
      phone: '',
      address: ''
    },
    invoiceMeta: {
      // Placeholder: actual sequence is allocated only when download/send is triggered.
      invoiceNumber: `SP-${year}-${month}-000`,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reference: ''
    },
    items,
    totals: {
      subtotal: computed.subtotal,
      tax: computed.tax,
      total: computed.total,
      currency: 'AUD',
    },
    discounts: {
      totalDiscount: 0,
      vipDiscount: 0,
      vipDiscountPercent: 0,
      promoDiscount: 0,
      promoDiscountPercent: 0,
      promoCode: ''
    },
    shipping: 0,
    paymentFee: 0,
    payment: {
      bank: COMPANY_BANK.bankName,
      accountName: COMPANY_BANK.accountName,
      bsb: COMPANY_BANK.bsb,
      account: COMPANY_BANK.accountNumber,
      note: COMPANY_BANK.paymentNote
    },
    notes: getDefaultNotesByCategory(category)
  }
}

export default function InvoicePreviewPage() {
  return (
    <AdminRoute requiredPermissions={['invoices:read']}>
      <div className="min-h-screen bg-gray-50">
        <AdminPageHeader
          title="Create & Send Invoice / Quote"
          icon={<FileText className="w-6 h-6" />}
          showBackButton={true}
          backUrl="/admin/dashboard"
          backLabel="Dashboard"
          showHomepageLink={false}
          showLanguageSelector={false}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <InvoicePreviewPageContent />
        </div>
      </div>
    </AdminRoute>
  )
}

type SavedClientProfile = {
  id: string
  label: string
  category: DocumentBusinessCategory
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

function InvoicePreviewPageContent() {
  const { adminUser } = useAdminAuth()
  const addSendLog = useDocumentSendLogStore((s) => s.addSendLog)
  const cmsShippingOptions = useContentStore((s) => s.shippingOptions)
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [pageTab, setPageTab] = useState<'create' | 'history'>('create')
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [pendingResendLogId, setPendingResendLogId] = useState<string | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [documentType, setDocumentType] = useState<'invoice' | 'quote'>('invoice')
  const [invoiceData, setInvoiceData] = useState(() => getDefaultInvoiceData())
  const [quoteData, setQuoteData] = useState<Omit<QuoteTemplateProps, 'items' | 'totals'> & {
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
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const base = getDefaultInvoiceData()
    return {
      ...base,
      quoteMeta: {
        // Placeholder: actual sequence is allocated only when download/send is triggered.
        quoteNumber: `QT-${year}-${month}-000`,
        issueDate: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reference: ''
      }
    }
  })
  const [recipientEmail, setRecipientEmail] = useState('')
  const [message, setMessage] = useState('')

  // Invoice/Quote reference number allocation:
  // - Default placeholders are `SP-YYYY-MM-000` / `QT-YYYY-MM-000`
  // - Real sequential numbers are allocated only when you download/send
  //   (and only if the current number is still the placeholder/legacy default).
  const ensureMonthlySequentialRefNumber = (
    prefix: 'SP' | 'QT',
    current: string,
    setRef: (next: string) => void
  ): string => {
    if (typeof window === 'undefined') return current

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const placeholder = `${prefix}-${year}-${month}-000`
    const legacyDefault = prefix === 'SP' ? 'SP-2025-001' : 'QT-2025-001'

    const shouldAllocate = current === placeholder || current === legacyDefault
    if (!shouldAllocate) return current

    try {
      const key = `selpic_${prefix.toLowerCase()}_seq_${year}_${month}`
      const currentValue = Number(window.localStorage.getItem(key) || '0')
      const nextValue = currentValue + 1
      window.localStorage.setItem(key, String(nextValue))
      const nextRef = `${prefix}-${year}-${month}-${String(nextValue).padStart(3, '0')}`
      setRef(nextRef)
      return nextRef
    } catch {
      // If localStorage is blocked, keep the current value to avoid breaking the flow.
      return current
    }
  }

  const ensureInvoiceRefNumber = (): string => {
    const current = invoiceData.invoiceMeta.invoiceNumber
    return ensureMonthlySequentialRefNumber('SP', current, (next) => {
      setInvoiceData((prev) => ({ ...prev, invoiceMeta: { ...prev.invoiceMeta, invoiceNumber: next } }))
    })
  }

  const ensureQuoteRefNumber = (): string => {
    const current = quoteData.quoteMeta.quoteNumber
    return ensureMonthlySequentialRefNumber('QT', current, (next) => {
      setQuoteData((prev) => ({ ...prev, quoteMeta: { ...prev.quoteMeta, quoteNumber: next } }))
    })
  }
  /** Step 1–5: 필요 시에만 펼쳐서 볼 수 있도록 접기/펼치기 (Create & Send Document와 동일) */
  const [showStep1CompanyInfo, setShowStep1CompanyInfo] = useState(false)
  const [showStep2BillingInfo, setShowStep2BillingInfo] = useState(false)
  const [showStep3Details, setShowStep3Details] = useState(false)
  const [showStep4LineItems, setShowStep4LineItems] = useState(false)
  const [showStep5Discounts, setShowStep5Discounts] = useState(false)
  // 비즈니스 유형 & 저장된 클라이언트 (Create & Send와 동일 개념)
  const [documentCategory, setDocumentCategory] = useState<DocumentBusinessCategory>('sticker')
  const documentShippingOptions = useMemo(
    () => listDocumentShippingOptionsForSelect(cmsShippingOptions, documentCategory),
    [cmsShippingOptions, documentCategory]
  )
  const [savedClients, setSavedClients] = useState<SavedClientProfile[]>([])
  const [selectedSavedClientId, setSelectedSavedClientId] = useState<string>('')
  const [newSavedClientLabel, setNewSavedClientLabel] = useState<string>('')
  const [isLoadingSavedClients, setIsLoadingSavedClients] = useState(false)
  const [savedClientsError, setSavedClientsError] = useState<string | null>(null)

  const waitForNextPaint = async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }

  const buildPdfOptions = (
    element: HTMLElement,
    filename: string
  ) => {
    const totalHeight = element.scrollHeight
    const totalWidth = element.scrollWidth

    return {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename,
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
      pagebreak: { mode: ['css', 'legacy'], before: '.page-break-before', after: '.page-break-after', avoid: ['.no-break'] }
    }
  }

  // Saved clients (cross-device): load from Supabase via admin API
  useEffect(() => {
    let isCancelled = false
    const load = async () => {
      setIsLoadingSavedClients(true)
      setSavedClientsError(null)
      try {
        const res = await fetch('/api/admin/saved-clients', { method: 'GET' })
        if (!res.ok) {
          const txt = await res.text()
          throw new Error(txt || `Failed to load saved clients (${res.status})`)
        }
        const json = (await res.json()) as { clients?: SavedClientProfile[] }
        if (!isCancelled) {
          setSavedClients(Array.isArray(json.clients) ? json.clients : [])
        }
      } catch (e: any) {
        if (!isCancelled) setSavedClientsError(e?.message || 'Failed to load saved clients')
      } finally {
        if (!isCancelled) setIsLoadingSavedClients(false)
      }
    }
    load()
    return () => {
      isCancelled = true
    }
  }, [])

  // 합계 자동 계산: 할인 후 GST (shared helper — do not add tax before discount)
  useEffect(() => {
    const data = documentType === 'invoice' ? invoiceData : quoteData
    const computed = computeDocumentCreateTotals({
      items: data.items,
      vipDiscountPercent: data.discounts?.vipDiscountPercent,
      promoDiscountPercent: data.discounts?.promoDiscountPercent,
      shipping: data.shipping,
      paymentFee: data.paymentFee,
    })

    if (documentType === 'invoice') {
      setInvoiceData((prev) => ({
        ...prev,
        discounts: {
          ...prev.discounts,
          vipDiscount: computed.vipDiscount > 0.01 ? computed.vipDiscount : undefined,
          promoDiscount: computed.promoDiscount > 0.01 ? computed.promoDiscount : undefined,
          totalDiscount: computed.totalDiscount > 0.01 ? computed.totalDiscount : undefined,
        },
        totals: {
          ...prev.totals,
          subtotal: computed.subtotal,
          tax: computed.tax,
          total: computed.total,
        },
      }))
    } else {
      setQuoteData((prev) => ({
        ...prev,
        discounts: {
          ...prev.discounts,
          vipDiscount: computed.vipDiscount > 0.01 ? computed.vipDiscount : undefined,
          promoDiscount: computed.promoDiscount > 0.01 ? computed.promoDiscount : undefined,
          totalDiscount: computed.totalDiscount > 0.01 ? computed.totalDiscount : undefined,
        },
        totals: {
          ...prev.totals,
          subtotal: computed.subtotal,
          tax: computed.tax,
          total: computed.total,
        },
      }))
    }
  }, [
    documentType,
    invoiceData.items,
    invoiceData.discounts?.vipDiscountPercent,
    invoiceData.discounts?.promoDiscountPercent,
    invoiceData.shipping,
    invoiceData.paymentFee,
    quoteData.items,
    quoteData.discounts?.vipDiscountPercent,
    quoteData.discounts?.promoDiscountPercent,
    quoteData.shipping,
    quoteData.paymentFee,
  ])

  const applyBusinessCategory = (category: DocumentBusinessCategory) => {
    setDocumentCategory(category)
    const items = getDefaultLineItemsByCategory(category) as InvoiceLineItem[]
    const notes = getDefaultNotesByCategory(category)
    const clearServiceFields = !documentCategoryShowsServiceSite(category)
    setInvoiceData((prev) => ({
      ...prev,
      billing: {
        ...prev.billing,
        ...(clearServiceFields
          ? { serviceAddress: '', serviceDate: '' }
          : {}),
      },
      items,
      notes,
      shipping: documentCategoryShowsShipping(category) ? prev.shipping : 0,
    }))
    setQuoteData((prev) => ({
      ...prev,
      billing: {
        ...prev.billing,
        ...(clearServiceFields
          ? { serviceAddress: '', serviceDate: '' }
          : {}),
      },
      items,
      notes,
      shipping: documentCategoryShowsShipping(category) ? prev.shipping : 0,
    }))
  }

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return

    setIsGeneratingPDF(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const element = invoiceRef.current
      
      await new Promise(resolve => setTimeout(resolve, 200))
      
      element.scrollIntoView({ behavior: 'instant', block: 'start' })
      element.parentElement?.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const docNumber = documentType === 'invoice'
        ? ensureInvoiceRefNumber()
        : ensureQuoteRefNumber()
      await waitForNextPaint()
      const opt = buildPdfOptions(
        element,
        `${documentType}-${docNumber}-${new Date().toISOString().split('T')[0]}.pdf`
      )
      await html2pdf().set(opt).from(element).save()
    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleAddItem = () => {
    const line = getNewDocumentLineItem(documentCategory) as InvoiceLineItem
    if (documentType === 'invoice') {
      setInvoiceData((prev) => ({
        ...prev,
        items: [...prev.items, line],
      }))
    } else {
      setQuoteData((prev) => ({
        ...prev,
        items: [...prev.items, line],
      }))
    }
  }

  const handleRemoveItem = (index: number) => {
    if (documentType === 'invoice') {
      setInvoiceData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }))
    } else {
      setQuoteData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }))
    }
  }

  const applyDocumentSnapshot = (log: DocumentSendLog) => {
    const snapshot = log.documentSnapshot
    if (!snapshot || typeof snapshot !== 'object') {
      alert('This history entry has no saved document data to open.')
      return false
    }

    if (log.documentType === 'quote') {
      setDocumentType('quote')
      setQuoteData(snapshot as typeof quoteData)
    } else {
      setDocumentType('invoice')
      setInvoiceData(snapshot as typeof invoiceData)
    }
    setRecipientEmail(log.recipientEmail || '')
    setMessage(log.content || '')
    setShowEditForm(true)
    return true
  }

  const handleOpenHistoryInEditor = (log: DocumentSendLog) => {
    if (!applyDocumentSnapshot(log)) return
    setPageTab('create')
  }

  const handleSendInvoice = async (options?: { resentFromId?: string }) => {
    const currentData = documentType === 'invoice' ? invoiceData : quoteData
    const emailToSend = (recipientEmail || currentData.billing.email || '').trim()
    if (!emailToSend || !emailToSend.includes('@')) {
      alert('Please enter a valid email address or set billing email.')
      return
    }

    setIsSending(true)
    const isInvoice = documentType === 'invoice'
    let docNumber = isInvoice
      ? invoiceData.invoiceMeta.invoiceNumber
      : quoteData.quoteMeta.quoteNumber
    let emailContent = ''
    let subject = ''
    const rawName = (currentData.billing.name || '').trim()
    const company = (currentData.billing.companyName || '').trim()
    const person =
      rawName && rawName !== 'Customer Name' ? formatCustomerDisplayName(rawName) : ''
    const emailLocal = (emailToSend.split('@')[0] || '').trim()
    const recipientDisplayName =
      company ||
      person ||
      (emailLocal ? formatCustomerDisplayName(emailLocal.replace(/[._]+/g, ' ')) : '') ||
      'Customer'
    const brandName = getCompanyBrandName(COMPANY_LEGAL.companyName)
    const sentBy = adminUser?.username || adminUser?.email || 'Admin'

    try {
      docNumber = isInvoice ? ensureInvoiceRefNumber() : ensureQuoteRefNumber()

      let pdfFile: File | null = null
      if (invoiceRef.current) {
        const html2pdf = (await import('html2pdf.js')).default
        const element = invoiceRef.current

        await new Promise((resolve) => setTimeout(resolve, 200))
        element.scrollIntoView({ behavior: 'instant', block: 'start' })
        element.parentElement?.scrollTo({ top: 0, left: 0, behavior: 'instant' })
        await new Promise((resolve) => setTimeout(resolve, 100))
        await waitForNextPaint()
        const opt = buildPdfOptions(element, `${documentType}-${docNumber}.pdf`)
        const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob')
        pdfFile = new File([pdfBlob], `${documentType}-${docNumber}.pdf`, { type: 'application/pdf' })
      }

      const docLabel = isInvoice ? 'tax invoice' : 'quote'
      emailContent =
        message ||
        `Dear ${recipientDisplayName},\n\n` +
          `We appreciate your business with ${brandName}.\n\n` +
          `Please find the attached ${docLabel} (${docNumber}) for your recent order/service.\n\n` +
          `Payment Instructions:\n` +
          `For bank transfers, please ensure the ${isInvoice ? 'Invoice Number' : 'Quote Number'} is included as your payment reference to help us identify your payment.\n\n` +
          `Thank you for choosing us. If you have any questions, please feel free to reply to this email.`

      subject = isInvoice
        ? `Tax Invoice ${docNumber} from ${brandName}`
        : `Quote ${docNumber} from ${brandName}`

      const emailResponse = await emailService.sendResponse({
        customerEmail: emailToSend,
        customerName: recipientDisplayName,
        subject,
        message: emailContent,
        adminName: sentBy,
        attachments: pdfFile ? [pdfFile] : [],
      })

      const snapshotSource = isInvoice
        ? {
            ...invoiceData,
            invoiceMeta: { ...invoiceData.invoiceMeta, invoiceNumber: docNumber },
          }
        : {
            ...quoteData,
            quoteMeta: { ...quoteData.quoteMeta, quoteNumber: docNumber },
          }

      addSendLog({
        documentType: isInvoice ? 'invoice' : 'quote',
        documentNumber: docNumber,
        recipientEmail: emailToSend,
        recipientName: recipientDisplayName,
        subject,
        content: emailContent,
        sentBy,
        status: emailResponse.success ? 'sent' : 'failed',
        source: 'create_send',
        documentSnapshot: JSON.parse(JSON.stringify(snapshotSource)) as Record<string, unknown>,
        errorMessage: emailResponse.success ? undefined : emailResponse.message,
        resentFromId: options?.resentFromId,
      })

      if (!emailResponse.success) {
        alert(`Failed to send ${isInvoice ? 'invoice' : 'quote'}: ${emailResponse.message}`)
        return
      }

      alert(`${isInvoice ? 'Invoice' : 'Quote'} sent successfully to ${emailToSend}!`)
      setRecipientEmail('')
      setMessage('')
    } catch (error) {
      console.error(`Failed to send ${documentType}:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      addSendLog({
        documentType: isInvoice ? 'invoice' : 'quote',
        documentNumber: docNumber,
        recipientEmail: emailToSend,
        recipientName: recipientDisplayName,
        subject: subject || `${isInvoice ? 'Invoice' : 'Quote'} ${docNumber}`,
        content: emailContent || message || '',
        sentBy,
        status: 'failed',
        source: 'create_send',
        documentSnapshot: JSON.parse(
          JSON.stringify(isInvoice ? invoiceData : quoteData)
        ) as Record<string, unknown>,
        errorMessage,
        resentFromId: options?.resentFromId,
      })
      alert(`Failed to send ${documentType}. Please try again.`)
    } finally {
      setIsSending(false)
      setResendingId(null)
    }
  }

  const handleResendFromHistory = (log: DocumentSendLog) => {
    if (!applyDocumentSnapshot(log)) return
    setResendingId(log.id)
    setPageTab('create')
    // Trigger send on the next paint after snapshot state is committed.
    setPendingResendLogId(log.id)
  }

  useEffect(() => {
    if (!pendingResendLogId || pageTab !== 'create') return
    const logId = pendingResendLogId
    let cancelled = false

    const run = async () => {
      await new Promise((resolve) => setTimeout(resolve, 400))
      await waitForNextPaint()
      if (cancelled) return
      setPendingResendLogId(null)
      await handleSendInvoice({ resentFromId: logId })
    }

    void run()
    return () => {
      cancelled = true
    }
    // Intentionally depends on pendingResendLogId/pageTab so send uses the restored form state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingResendLogId, pageTab])

  return (
    <AdminRoute requiredPermissions={['invoices:read']}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create & Send Document</h1>
                <p className="text-gray-600 mt-1">Create and send invoices or quotes to customers</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4 border-b border-gray-200">
              <button
                type="button"
                onClick={() => setPageTab('create')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 ${
                  pageTab === 'create'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                Create & Send
              </button>
              <button
                type="button"
                onClick={() => setPageTab('history')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 ${
                  pageTab === 'history'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <History className="w-4 h-4" />
                Send History
              </button>
            </div>

            {pageTab === 'create' && (
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setDocumentType('invoice')}
                  className={`px-6 py-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                    documentType === 'invoice'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <Receipt className="w-5 h-5" />
                  <span className="font-semibold">Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDocumentType('quote')}
                  className={`px-6 py-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                    documentType === 'quote'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span className="font-semibold">Quote</span>
                </button>
              </div>
            )}
          </div>

          {pageTab === 'history' && (
            <InvoiceQuoteSendHistoryPanel
              typesFilter={['invoice', 'quote']}
              onOpenInEditor={handleOpenHistoryInEditor}
              onResend={handleResendFromHistory}
              resendingId={resendingId}
            />
          )}

          {pageTab === 'create' && (
          <>
          {/* Business type & edit form toggle */}
          <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Business:</span>
              <button
                type="button"
                onClick={() => applyBusinessCategory('sticker')}
                className={`px-4 py-2 rounded-lg border-2 transition-all text-sm flex items-center gap-2 ${
                  documentCategory === 'sticker'
                    ? 'border-green-600 bg-green-50 text-green-800'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <span className="font-medium">Sticker</span>
              </button>
              <button
                type="button"
                onClick={() => applyBusinessCategory('market-s')}
                className={`px-4 py-2 rounded-lg border-2 transition-all text-sm flex items-center gap-2 ${
                  documentCategory === 'market-s'
                    ? 'border-green-600 bg-green-50 text-green-800'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <span className="font-medium">Market S</span>
              </button>
              <button
                type="button"
                onClick={() => applyBusinessCategory('cleaning')}
                className={`px-4 py-2 rounded-lg border-2 transition-all text-sm flex items-center gap-2 ${
                  documentCategory === 'cleaning'
                    ? 'border-green-600 bg-green-50 text-green-800'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <span className="font-medium">Cleaning</span>
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowEditForm(!showEditForm)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                {showEditForm ? (
                  <>
                    <Eye className="w-4 h-4" />
                    Hide Form
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4" />
                    Edit Invoice
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 편집 폼 */}
            {showEditForm && (
              <div className="space-y-6">
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
                        value={documentType === 'invoice' ? invoiceData.company.name : quoteData.company.name}
                        onChange={e => {
                          if (documentType === 'invoice') {
                            setInvoiceData(prev => ({ ...prev, company: { ...prev.company, name: e.target.value } }))
                          } else {
                            setQuoteData(prev => ({ ...prev, company: { ...prev.company, name: e.target.value } }))
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
                          value={documentType === 'invoice' ? (invoiceData.company.abn || '') : (quoteData.company.abn || '')}
                          onChange={e => {
                            if (documentType === 'invoice') {
                              setInvoiceData(prev => ({ ...prev, company: { ...prev.company, abn: e.target.value } }))
                            } else {
                              setQuoteData(prev => ({ ...prev, company: { ...prev.company, abn: e.target.value } }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ACN</label>
                        <input
                          type="text"
                          value={documentType === 'invoice' ? (invoiceData.company.acn || '') : (quoteData.company.acn || '')}
                          onChange={e => {
                            if (documentType === 'invoice') {
                              setInvoiceData(prev => ({ ...prev, company: { ...prev.company, acn: e.target.value } }))
                            } else {
                              setQuoteData(prev => ({ ...prev, company: { ...prev.company, acn: e.target.value } }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="text"
                          value={documentType === 'invoice' ? (invoiceData.company.phone || '') : (quoteData.company.phone || '')}
                          onChange={e => {
                            if (documentType === 'invoice') {
                              setInvoiceData(prev => ({ ...prev, company: { ...prev.company, phone: e.target.value } }))
                            } else {
                              setQuoteData(prev => ({ ...prev, company: { ...prev.company, phone: e.target.value } }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={documentType === 'invoice' ? (invoiceData.company.email || '') : (quoteData.company.email || '')}
                          onChange={e => {
                            if (documentType === 'invoice') {
                              setInvoiceData(prev => ({ ...prev, company: { ...prev.company, email: e.target.value } }))
                            } else {
                              setQuoteData(prev => ({ ...prev, company: { ...prev.company, email: e.target.value } }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={documentType === 'invoice' ? (invoiceData.company.address || '') : (quoteData.company.address || '')}
                        onChange={e => {
                          if (documentType === 'invoice') {
                            setInvoiceData(prev => ({ ...prev, company: { ...prev.company, address: e.target.value } }))
                          } else {
                            setQuoteData(prev => ({ ...prev, company: { ...prev.company, address: e.target.value } }))
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
                      <h3 className="text-lg font-semibold text-gray-900">Step 2 – {documentType === 'invoice' ? 'Billing' : 'Quote To'} Information</h3>
                      <p className="text-xs text-gray-500 mt-1">Enter the customer details. Click to {showStep2BillingInfo ? 'collapse' : 'expand'}.</p>
                    </div>
                    {showStep2BillingInfo ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                  </button>
                  {showStep2BillingInfo && (
                  <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
                    {/* 저장된 파트너/고객 프로필 선택 및 저장 (Documents 화면과 동일 컨셉) */}
                      <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50 space-y-3">
                        {savedClientsError && (
                          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1">
                            {savedClientsError}
                          </div>
                        )}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Saved Clients / Partners</label>
                          <select
                            value={selectedSavedClientId}
                            onChange={e => setSelectedSavedClientId(e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                              disabled={isLoadingSavedClients}
                          >
                              <option value="">
                                {isLoadingSavedClients ? 'Loading saved clients...' : 'Select saved client'}
                              </option>
                            {savedClients.map(client => (
                              <option key={client.id} value={client.id}>
                                {client.label} ({documentCategoryLabel(client.category)})
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
                            if (documentType === 'invoice') {
                              setInvoiceData(prev => ({
                                ...prev,
                                billing: apply(prev.billing)
                              }))
                            } else {
                              setQuoteData(prev => ({
                                ...prev,
                                billing: apply(prev.billing)
                              }))
                            }
                            if (target.category) {
                              setDocumentCategory(target.category)
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
                              const id = selectedSavedClientId
                              ;(async () => {
                                try {
                                  const res = await fetch(`/api/admin/saved-clients/${encodeURIComponent(id)}`, {
                                    method: 'DELETE',
                                  })
                                  if (!res.ok) {
                                    const txt = await res.text()
                                    throw new Error(txt || `Failed to delete (${res.status})`)
                                  }
                                  setSavedClients(prev => prev.filter(c => c.id !== id))
                                  setSelectedSavedClientId('')
                                } catch (e: any) {
                                  setSavedClientsError(e?.message || 'Failed to delete saved client')
                                }
                              })()
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
                            const billing = documentType === 'invoice' ? invoiceData.billing : quoteData.billing
                            const payload = {
                              label,
                              category: documentCategory,
                              billing: {
                                companyName: (billing as any).companyName,
                                companyAbn: (billing as any).companyAbn,
                                serviceAddress: (billing as any).serviceAddress,
                                serviceDate: (billing as any).serviceDate,
                                name: billing.name,
                                email: billing.email,
                                phone: billing.phone,
                                address: billing.address,
                              },
                            }
                            ;(async () => {
                              setSavedClientsError(null)
                              try {
                                const res = await fetch('/api/admin/saved-clients', {
                                  method: 'POST',
                                  headers: { 'content-type': 'application/json' },
                                  body: JSON.stringify(payload),
                                })
                                const json = await res.json().catch(() => ({}))
                                if (!res.ok) {
                                  throw new Error(json?.error || `Failed to save (${res.status})`)
                                }
                                const created = json?.client as SavedClientProfile | undefined
                                if (created) {
                                  setSavedClients(prev => [created, ...prev])
                                  setSelectedSavedClientId(created.id)
                                }
                                setNewSavedClientLabel('')
                              } catch (e: any) {
                                setSavedClientsError(e?.message || 'Failed to save client')
                              }
                            })()
                          }}
                          className="px-3 py-2 text-xs sm:text-sm bg-green-600 text-white rounded-md"
                        >
                          Save Client
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name{' '}
                        <span className="text-gray-400 text-xs">(business — enough on its own)</span>
                      </label>
                      <input
                        type="text"
                        value={documentType === 'invoice'
                          ? (invoiceData.billing.companyName || '')
                          : (quoteData.billing.companyName || '')}
                        onChange={e => {
                          const companyName = e.target.value
                          const clearPlaceholderName = (prevName: string) => {
                            const n = (prevName || '').trim()
                            return !n || n === 'Customer Name' ? '' : prevName
                          }
                          if (documentType === 'invoice') {
                            setInvoiceData(prev => ({
                              ...prev,
                              billing: {
                                ...prev.billing,
                                companyName,
                                // Company alone is enough for Bill To; drop placeholder customer name
                                name: companyName.trim()
                                  ? clearPlaceholderName(prev.billing.name || '')
                                  : prev.billing.name,
                              },
                            }))
                          } else {
                            setQuoteData(prev => ({
                              ...prev,
                              billing: {
                                ...prev.billing,
                                companyName,
                                name: companyName.trim()
                                  ? clearPlaceholderName(prev.billing.name || '')
                                  : prev.billing.name,
                              },
                            }))
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g. ABC Cleaning Services Pty Ltd"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company ABN (Optional)</label>
                      <input
                        type="text"
                        value={documentType === 'invoice'
                          ? (invoiceData.billing.companyAbn || '')
                          : (quoteData.billing.companyAbn || '')}
                        onChange={e => {
                          if (documentType === 'invoice') {
                            setInvoiceData(prev => ({
                              ...prev,
                              billing: { ...prev.billing, companyAbn: e.target.value }
                            }))
                          } else {
                            setQuoteData(prev => ({
                              ...prev,
                              billing: { ...prev.billing, companyAbn: e.target.value }
                            }))
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g. 12 345 678 901"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {(documentType === 'invoice'
                          ? invoiceData.billing.companyName
                          : quoteData.billing.companyName
                        )?.trim()
                          ? 'Contact person (optional)'
                          : 'Customer Name'}
                        {(documentType === 'invoice'
                          ? invoiceData.billing.companyName
                          : quoteData.billing.companyName
                        )?.trim() ? (
                          <span className="text-gray-400 text-xs font-normal"> — only if Attn needed</span>
                        ) : (
                          <span className="text-gray-400 text-xs font-normal"> — for individuals without company</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={
                          (() => {
                            const n =
                              documentType === 'invoice'
                                ? invoiceData.billing.name
                                : quoteData.billing.name
                            return n === 'Customer Name' ? '' : n || ''
                          })()
                        }
                        onChange={e => {
                          if (documentType === 'invoice') {
                            setInvoiceData(prev => ({ ...prev, billing: { ...prev.billing, name: e.target.value } }))
                          } else {
                            setQuoteData(prev => ({ ...prev, billing: { ...prev.billing, name: e.target.value } }))
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder={
                          (documentType === 'invoice'
                            ? invoiceData.billing.companyName
                            : quoteData.billing.companyName
                          )?.trim()
                            ? 'Optional contact / Attn name'
                            : 'Individual customer name'
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={documentType === 'invoice' ? (invoiceData.billing.email || '') : (quoteData.billing.email || '')}
                          onChange={e => {
                            if (documentType === 'invoice') {
                              setInvoiceData(prev => ({ ...prev, billing: { ...prev.billing, email: e.target.value } }))
                            } else {
                              setQuoteData(prev => ({ ...prev, billing: { ...prev.billing, email: e.target.value } }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="text"
                          value={documentType === 'invoice' ? (invoiceData.billing.phone || '') : (quoteData.billing.phone || '')}
                          onChange={e => {
                            if (documentType === 'invoice') {
                              setInvoiceData(prev => ({ ...prev, billing: { ...prev.billing, phone: e.target.value } }))
                            } else {
                              setQuoteData(prev => ({ ...prev, billing: { ...prev.billing, phone: e.target.value } }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={documentType === 'invoice' ? (invoiceData.billing.address || '') : (quoteData.billing.address || '')}
                        onChange={e => {
                          if (documentType === 'invoice') {
                            setInvoiceData(prev => ({ ...prev, billing: { ...prev.billing, address: e.target.value } }))
                          } else {
                            setQuoteData(prev => ({ ...prev, billing: { ...prev.billing, address: e.target.value } }))
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={2}
                      />
                    </div>
                    {documentCategoryShowsServiceSite(documentCategory) && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Service Address (Cleaning Site) (Optional)</label>
                          <textarea
                            value={documentType === 'invoice'
                              ? (invoiceData.billing.serviceAddress || '')
                              : (quoteData.billing.serviceAddress || '')}
                            onChange={e => {
                              if (documentType === 'invoice') {
                                setInvoiceData(prev => ({
                                  ...prev,
                                  billing: { ...prev.billing, serviceAddress: e.target.value }
                                }))
                              } else {
                                setQuoteData(prev => ({
                                  ...prev,
                                  billing: { ...prev.billing, serviceAddress: e.target.value }
                                }))
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            rows={2}
                            placeholder="Cleaning job location (if different from billing address)"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Service Date (Optional)</label>
                          <input
                            type="date"
                            value={documentType === 'invoice'
                              ? (invoiceData.billing.serviceDate || '')
                              : (quoteData.billing.serviceDate || '')}
                            onChange={e => {
                              if (documentType === 'invoice') {
                                setInvoiceData(prev => ({
                                  ...prev,
                                  billing: { ...prev.billing, serviceDate: e.target.value }
                                }))
                              } else {
                                setQuoteData(prev => ({
                                  ...prev,
                                  billing: { ...prev.billing, serviceDate: e.target.value }
                                }))
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </>
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
                      <h3 className="text-lg font-semibold text-gray-900">{documentType === 'invoice' ? 'Step 3 – Invoice Details' : 'Step 3 – Quote Details'}</h3>
                      <p className="text-xs text-gray-500 mt-1">Set the document number, dates, and reference. Click to {showStep3Details ? 'collapse' : 'expand'}.</p>
                    </div>
                    {showStep3Details ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                  </button>
                  {showStep3Details && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                {documentType === 'invoice' ? (
                  <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                        <input
                          type="text"
                          value={invoiceData.invoiceMeta.invoiceNumber}
                          onChange={e => setInvoiceData(prev => ({ ...prev, invoiceMeta: { ...prev.invoiceMeta, invoiceNumber: e.target.value } }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                          <input
                            type="date"
                            value={invoiceData.invoiceMeta.issueDate}
                            onChange={e => setInvoiceData(prev => ({ ...prev, invoiceMeta: { ...prev.invoiceMeta, issueDate: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                          <input
                            type="date"
                            value={invoiceData.invoiceMeta.dueDate || ''}
                            onChange={e => setInvoiceData(prev => ({ ...prev, invoiceMeta: { ...prev.invoiceMeta, dueDate: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                        <input
                          type="text"
                          value={invoiceData.invoiceMeta.reference || ''}
                          onChange={e => setInvoiceData(prev => ({ ...prev, invoiceMeta: { ...prev.invoiceMeta, reference: e.target.value } }))}
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
                          value={quoteData.quoteMeta.quoteNumber}
                          onChange={e => setQuoteData(prev => ({ ...prev, quoteMeta: { ...prev.quoteMeta, quoteNumber: e.target.value } }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                          <input
                            type="date"
                            value={quoteData.quoteMeta.issueDate}
                            onChange={e => setQuoteData(prev => ({ ...prev, quoteMeta: { ...prev.quoteMeta, issueDate: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                          <input
                            type="date"
                            value={quoteData.quoteMeta.validUntil || ''}
                            onChange={e => setQuoteData(prev => ({ ...prev, quoteMeta: { ...prev.quoteMeta, validUntil: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                        <input
                          type="text"
                          value={quoteData.quoteMeta.reference || ''}
                          onChange={e => setQuoteData(prev => ({ ...prev, quoteMeta: { ...prev.quoteMeta, reference: e.target.value } }))}
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
                        <h3 className="text-lg font-semibold text-gray-900">
                          {documentCategory === 'cleaning'
                            ? 'Step 4 – Service Line Items'
                            : documentCategory === 'market-s'
                              ? 'Step 4 – Market S Line Items'
                              : 'Step 4 – Line Items'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {documentCategory === 'cleaning'
                            ? 'Add cleaning services (unit prices are ex-GST). Click to '
                            : documentCategory === 'market-s'
                              ? 'Pick Single Item or Family Bundle, then brand/SKU in details (ex-GST). Click to '
                              : 'Add and edit line items. Click to '}
                          {showStep4LineItems ? 'collapse' : 'expand'}.
                        </p>
                      </div>
                      {showStep4LineItems ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                    </button>
                  </div>
                  {showStep4LineItems && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                    <div className="flex justify-end">
                      <button
                        onClick={handleAddItem}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                      >
                        <Plus size={16} />
                        {documentCategory === 'cleaning'
                          ? 'Add service line'
                          : documentCategory === 'market-s'
                            ? 'Add Market S line'
                            : 'Add Item'}
                      </button>
                    </div>
                  <div className="space-y-4">
                    {(documentType === 'invoice' ? invoiceData.items : quoteData.items).map((item, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="space-y-3">
                          {documentCategory === 'cleaning' ? (
                            <>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Service type
                                </label>
                                <select
                                  value={resolveCleaningServiceSelectValue(item.description)}
                                  onChange={(e) => {
                                    const selected = e.target.value
                                    const extra = getCleaningServiceExtraDetails(item.description)
                                    const nextDescription = buildCleaningServiceDescription(
                                      selected,
                                      selected === CLEANING_SERVICE_CUSTOM ? extra || '' : extra
                                    )
                                    if (documentType === 'invoice') {
                                      const newItems = [...invoiceData.items]
                                      newItems[index] = { ...item, description: nextDescription }
                                      setInvoiceData((prev) => ({ ...prev, items: newItems }))
                                    } else {
                                      const newItems = [...quoteData.items]
                                      newItems[index] = { ...item, description: nextDescription }
                                      setQuoteData((prev) => ({ ...prev, items: newItems }))
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                                >
                                  {CLEANING_SERVICE_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                  <option value={CLEANING_SERVICE_CUSTOM}>Custom / other…</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Extra details (optional)
                                </label>
                                <textarea
                                  value={
                                    resolveCleaningServiceSelectValue(item.description) ===
                                    CLEANING_SERVICE_CUSTOM
                                      ? item.description
                                      : getCleaningServiceExtraDetails(item.description)
                                  }
                                  onChange={(e) => {
                                    const selected = resolveCleaningServiceSelectValue(
                                      item.description
                                    )
                                    const nextDescription = buildCleaningServiceDescription(
                                      selected === CLEANING_SERVICE_CUSTOM
                                        ? CLEANING_SERVICE_CUSTOM
                                        : selected,
                                      e.target.value
                                    )
                                    if (documentType === 'invoice') {
                                      const newItems = [...invoiceData.items]
                                      newItems[index] = { ...item, description: nextDescription }
                                      setInvoiceData((prev) => ({ ...prev, items: newItems }))
                                    } else {
                                      const newItems = [...quoteData.items]
                                      newItems[index] = { ...item, description: nextDescription }
                                      setQuoteData((prev) => ({ ...prev, items: newItems }))
                                    }
                                  }}
                                  rows={2}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm resize-y"
                                  placeholder="Room notes, site notes, etc. (optional)"
                                />
                              </div>
                            </>
                          ) : documentCategory === 'market-s' &&
                            isMarketSSelectableProductLine(item.description) ? (
                            <>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Pack class (shipping)
                                </label>
                                <select
                                  value={resolveMarketSLineSelectValue(item.description)}
                                  onChange={(e) => {
                                    const selected = e.target.value
                                    const extra = getMarketSLineExtraDetails(item.description)
                                    const nextDescription = buildMarketSLineDescription(
                                      selected,
                                      selected === MARKET_S_LINE_CUSTOM ? extra || '' : extra
                                    )
                                    if (documentType === 'invoice') {
                                      const newItems = [...invoiceData.items]
                                      newItems[index] = { ...item, description: nextDescription }
                                      setInvoiceData((prev) => ({ ...prev, items: newItems }))
                                    } else {
                                      const newItems = [...quoteData.items]
                                      newItems[index] = { ...item, description: nextDescription }
                                      setQuoteData((prev) => ({ ...prev, items: newItems }))
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                                >
                                  {MARKET_S_LINE_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                  <option value={MARKET_S_LINE_CUSTOM}>Custom product…</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Brand / product details
                                </label>
                                <textarea
                                  value={
                                    resolveMarketSLineSelectValue(item.description) ===
                                    MARKET_S_LINE_CUSTOM
                                      ? item.description
                                      : getMarketSLineExtraDetails(item.description)
                                  }
                                  onChange={(e) => {
                                    const selected = resolveMarketSLineSelectValue(item.description)
                                    const nextDescription = buildMarketSLineDescription(
                                      selected === MARKET_S_LINE_CUSTOM
                                        ? MARKET_S_LINE_CUSTOM
                                        : selected,
                                      e.target.value
                                    )
                                    if (documentType === 'invoice') {
                                      const newItems = [...invoiceData.items]
                                      newItems[index] = { ...item, description: nextDescription }
                                      setInvoiceData((prev) => ({ ...prev, items: newItems }))
                                    } else {
                                      const newItems = [...quoteData.items]
                                      newItems[index] = { ...item, description: nextDescription }
                                      setQuoteData((prev) => ({ ...prev, items: newItems }))
                                    }
                                  }}
                                  rows={2}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm resize-y"
                                  placeholder="e.g. Mediheel 15ml × 1 (optional)"
                                />
                              </div>
                            </>
                          ) : documentCategoryUsesShippingSelect(documentCategory) &&
                            isDocumentShippingLine(item.description) ? (
                            <>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Shipping method (AusPost)
                                </label>
                                <select
                                  value={resolveDocumentShippingSelectValue(
                                    item.description,
                                    documentShippingOptions
                                  )}
                                  onChange={(e) => {
                                    const selected = e.target.value
                                    if (!selected) {
                                      const next = applyDocumentShippingOptionToLine(item, null)
                                      if (documentType === 'invoice') {
                                        const newItems = [...invoiceData.items]
                                        newItems[index] = next
                                        setInvoiceData((prev) => ({ ...prev, items: newItems }))
                                      } else {
                                        const newItems = [...quoteData.items]
                                        newItems[index] = next
                                        setQuoteData((prev) => ({ ...prev, items: newItems }))
                                      }
                                      return
                                    }
                                    if (selected === DOCUMENT_SHIPPING_CUSTOM) {
                                      const next = {
                                        ...item,
                                        description: item.description?.trim()
                                          ? item.description
                                          : 'Shipping — Custom',
                                        taxRate: 0,
                                      }
                                      if (documentType === 'invoice') {
                                        const newItems = [...invoiceData.items]
                                        newItems[index] = next
                                        setInvoiceData((prev) => ({ ...prev, items: newItems }))
                                      } else {
                                        const newItems = [...quoteData.items]
                                        newItems[index] = next
                                        setQuoteData((prev) => ({ ...prev, items: newItems }))
                                      }
                                      return
                                    }
                                    const option =
                                      documentShippingOptions.find((o) => String(o.id) === selected) ||
                                      null
                                    const next = applyDocumentShippingOptionToLine(item, option)
                                    if (documentType === 'invoice') {
                                      const newItems = [...invoiceData.items]
                                      newItems[index] = next
                                      setInvoiceData((prev) => ({
                                        ...prev,
                                        items: newItems,
                                        // Avoid double-counting: fee lives on the line item
                                        shipping: 0,
                                      }))
                                    } else {
                                      const newItems = [...quoteData.items]
                                      newItems[index] = next
                                      setQuoteData((prev) => ({
                                        ...prev,
                                        items: newItems,
                                        shipping: 0,
                                      }))
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                                >
                                  <option value="">Select shipping…</option>
                                  {documentShippingOptions.map((opt) => (
                                    <option key={String(opt.id)} value={String(opt.id)}>
                                      {opt.name}
                                      {typeof opt.price === 'number'
                                        ? ` — $${Number(opt.price).toFixed(2)}`
                                        : ''}
                                    </option>
                                  ))}
                                  <option value={DOCUMENT_SHIPPING_CUSTOM}>Custom shipping…</option>
                                </select>
                              </div>
                              {resolveDocumentShippingSelectValue(
                                item.description,
                                documentShippingOptions
                              ) === DOCUMENT_SHIPPING_CUSTOM && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Shipping description
                                  </label>
                                  <textarea
                                    value={item.description}
                                    onChange={(e) => {
                                      if (documentType === 'invoice') {
                                        const newItems = [...invoiceData.items]
                                        newItems[index] = {
                                          ...item,
                                          description: e.target.value,
                                          taxRate: 0,
                                        }
                                        setInvoiceData((prev) => ({ ...prev, items: newItems }))
                                      } else {
                                        const newItems = [...quoteData.items]
                                        newItems[index] = {
                                          ...item,
                                          description: e.target.value,
                                          taxRate: 0,
                                        }
                                        setQuoteData((prev) => ({ ...prev, items: newItems }))
                                      }
                                    }}
                                    rows={2}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm resize-y"
                                    placeholder="Shipping — custom method"
                                  />
                                </div>
                              )}
                            </>
                          ) : (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Description (line breaks allowed)</label>
                            <textarea
                              value={item.description}
                              onChange={e => {
                                if (documentType === 'invoice') {
                                  const newItems = [...invoiceData.items]
                                  newItems[index] = { ...item, description: e.target.value }
                                  setInvoiceData(prev => ({ ...prev, items: newItems }))
                                } else {
                                  const newItems = [...quoteData.items]
                                  newItems[index] = { ...item, description: e.target.value }
                                  setQuoteData(prev => ({ ...prev, items: newItems }))
                                }
                              }}
                              rows={3}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm resize-y"
                              placeholder="Product or service name / detailed description (multi-line)"
                            />
                          </div>
                          )}
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                              <input
                                type="number"
                                value={item.qty}
                                onChange={e => {
                                  if (documentType === 'invoice') {
                                    const newItems = [...invoiceData.items]
                                    newItems[index] = { ...item, qty: Number(e.target.value) }
                                    setInvoiceData(prev => ({ ...prev, items: newItems }))
                                  } else {
                                    const newItems = [...quoteData.items]
                                    newItems[index] = { ...item, qty: Number(e.target.value) }
                                    setQuoteData(prev => ({ ...prev, items: newItems }))
                                  }
                                }}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                {documentCategory === 'cleaning' || documentCategory === 'market-s'
                                  ? 'Unit Price (ex-GST)'
                                  : 'Unit Price'}
                              </label>
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={e => {
                                  if (documentType === 'invoice') {
                                    const newItems = [...invoiceData.items]
                                    newItems[index] = { ...item, unitPrice: Number(e.target.value) }
                                    setInvoiceData(prev => ({ ...prev, items: newItems }))
                                  } else {
                                    const newItems = [...quoteData.items]
                                    newItems[index] = { ...item, unitPrice: Number(e.target.value) }
                                    setQuoteData(prev => ({ ...prev, items: newItems }))
                                  }
                                }}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">GST Rate</label>
                              <input
                                type="number"
                                value={item.taxRate}
                                onChange={e => {
                                  if (documentType === 'invoice') {
                                    const newItems = [...invoiceData.items]
                                    newItems[index] = { ...item, taxRate: Number(e.target.value) }
                                    setInvoiceData(prev => ({ ...prev, items: newItems }))
                                  } else {
                                    const newItems = [...quoteData.items]
                                    newItems[index] = { ...item, taxRate: Number(e.target.value) }
                                    setQuoteData(prev => ({ ...prev, items: newItems }))
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
                      </div>
                    ))}
                  </div>
                  </div>
                  )}
                </div>

                {/* Step 5: 할인 및 추가 비용 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <button
                    type="button"
                    onClick={() => setShowStep5Discounts(!showStep5Discounts)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Step 5 – Discounts & Additional Charges</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {documentCategory === 'cleaning'
                          ? 'Apply VIP and promo discounts and payment fees (GST recalculates after discount). Click to '
                          : documentCategory === 'market-s'
                            ? 'Apply VIP/promo discounts, AusPost shipping, and payment fees. Click to '
                            : 'Apply VIP and promo discounts, shipping, and payment fees. Click to '}
                        {showStep5Discounts ? 'collapse' : 'expand'}.
                      </p>
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
                          value={(() => {
                            const value = documentType === 'invoice' 
                              ? invoiceData.discounts?.vipDiscountPercent 
                              : quoteData.discounts?.vipDiscountPercent
                            return value !== undefined && value !== null ? value : ''
                          })()}
                          onChange={e => {
                            // 빈 값일 때는 undefined로 설정, 숫자일 때만 숫자로 변환
                            const value = e.target.value.trim()
                            const vipDiscountPercent = value === '' ? undefined : (Number(value) || 0)
                            if (documentType === 'invoice') {
                              setInvoiceData(prev => ({
                                ...prev,
                                discounts: {
                                  ...prev.discounts,
                                  vipDiscountPercent
                                }
                              }))
                            } else {
                              setQuoteData(prev => ({
                                ...prev,
                                discounts: {
                                  ...prev.discounts,
                                  vipDiscountPercent
                                }
                              }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="0"
                        />
                        {((documentType === 'invoice' ? invoiceData.discounts?.vipDiscountPercent : quoteData.discounts?.vipDiscountPercent) || 0) > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Discount amount: ${((documentType === 'invoice' ? invoiceData.items : quoteData.items).reduce((sum, item) => sum + item.unitPrice * item.qty, 0) * (((documentType === 'invoice' ? invoiceData.discounts?.vipDiscountPercent : quoteData.discounts?.vipDiscountPercent) || 0) / 100)).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Promo Discount (%)</label>
                        <input
                          type="number"
                          value={(() => {
                            const value = documentType === 'invoice' 
                              ? invoiceData.discounts?.promoDiscountPercent 
                              : quoteData.discounts?.promoDiscountPercent
                            return value !== undefined && value !== null ? value : ''
                          })()}
                          onChange={e => {
                            // 빈 값일 때는 undefined로 설정, 숫자일 때만 숫자로 변환
                            const value = e.target.value.trim()
                            const promoDiscountPercent = value === '' ? undefined : (Number(value) || 0)
                            if (documentType === 'invoice') {
                              setInvoiceData(prev => ({
                                ...prev,
                                discounts: {
                                  ...prev.discounts,
                                  promoDiscountPercent
                                }
                              }))
                            } else {
                              setQuoteData(prev => ({
                                ...prev,
                                discounts: {
                                  ...prev.discounts,
                                  promoDiscountPercent
                                }
                              }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="0"
                        />
                        {((documentType === 'invoice' ? invoiceData.discounts?.promoDiscountPercent : quoteData.discounts?.promoDiscountPercent) || 0) > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Discount amount: ${((documentType === 'invoice' ? invoiceData.items : quoteData.items).reduce((sum, item) => sum + item.unitPrice * item.qty, 0) * (((documentType === 'invoice' ? invoiceData.discounts?.promoDiscountPercent : quoteData.discounts?.promoDiscountPercent) || 0) / 100)).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code (Optional)</label>
                      <input
                        type="text"
                        value={documentType === 'invoice' ? (invoiceData.discounts?.promoCode || '') : (quoteData.discounts?.promoCode || '')}
                        onChange={e => {
                          if (documentType === 'invoice') {
                            setInvoiceData(prev => ({
                              ...prev,
                              discounts: {
                                ...prev.discounts,
                                promoCode: e.target.value
                              }
                            }))
                          } else {
                            setQuoteData(prev => ({
                              ...prev,
                              discounts: {
                                ...prev.discounts,
                                promoCode: e.target.value
                              }
                            }))
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., SUMMER2025"
                      />
                    </div>
                    <div className={`grid gap-4 ${documentCategoryShowsShipping(documentCategory) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {documentCategoryShowsShipping(documentCategory) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shipping ($)</label>
                        <input
                          type="number"
                          value={documentType === 'invoice' ? (invoiceData.shipping || 0) : (quoteData.shipping || 0)}
                          onChange={e => {
                            if (documentType === 'invoice') {
                              setInvoiceData(prev => ({
                                ...prev,
                                shipping: Number(e.target.value) || 0
                              }))
                            } else {
                              setQuoteData(prev => ({
                                ...prev,
                                shipping: Number(e.target.value) || 0
                              }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Fee ($)</label>
                        <input
                          type="number"
                          value={documentType === 'invoice' ? (invoiceData.paymentFee || 0) : (quoteData.paymentFee || 0)}
                          onChange={e => {
                            if (documentType === 'invoice') {
                              setInvoiceData(prev => ({
                                ...prev,
                                paymentFee: Number(e.target.value) || 0
                              }))
                            } else {
                              setQuoteData(prev => ({
                                ...prev,
                                paymentFee: Number(e.target.value) || 0
                              }))
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

                {/* 결제 정보 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                        <input
                          type="text"
                          value={documentType === 'invoice' ? (invoiceData.payment?.bank || '') : (quoteData.payment?.bank || '')}
                          onChange={e => {
                            if (documentType === 'invoice') {
                              setInvoiceData(prev => ({ ...prev, payment: { ...prev.payment, bank: e.target.value } }))
                            } else {
                              setQuoteData(prev => ({ ...prev, payment: { ...prev.payment, bank: e.target.value } }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Name (payee)</label>
                        <input
                          type="text"
                          value={documentType === 'invoice' ? (invoiceData.payment?.accountName || '') : (quoteData.payment?.accountName || '')}
                          onChange={e => {
                            if (documentType === 'invoice') {
                              setInvoiceData(prev => ({ ...prev, payment: { ...prev.payment, accountName: e.target.value } }))
                            } else {
                              setQuoteData(prev => ({ ...prev, payment: { ...prev.payment, accountName: e.target.value } }))
                            }
                          }}
                          placeholder="e.g. SELPIC PTY LTD"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">BSB</label>
                        <input
                          type="text"
                          value={documentType === 'invoice' ? (invoiceData.payment?.bsb || '') : (quoteData.payment?.bsb || '')}
                          onChange={e => {
                            if (documentType === 'invoice') {
                              setInvoiceData(prev => ({ ...prev, payment: { ...prev.payment, bsb: e.target.value } }))
                            } else {
                              setQuoteData(prev => ({ ...prev, payment: { ...prev.payment, bsb: e.target.value } }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={documentType === 'invoice' ? (invoiceData.payment?.account || '') : (quoteData.payment?.account || '')}
                        onChange={e => {
                          if (documentType === 'invoice') {
                            setInvoiceData(prev => ({ ...prev, payment: { ...prev.payment, account: e.target.value } }))
                          } else {
                            setQuoteData(prev => ({ ...prev, payment: { ...prev.payment, account: e.target.value } }))
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Note</label>
                      <textarea
                        value={documentType === 'invoice' ? (invoiceData.payment?.note || '') : (quoteData.payment?.note || '')}
                        onChange={e => {
                          if (documentType === 'invoice') {
                            setInvoiceData(prev => ({ ...prev, payment: { ...prev.payment, note: e.target.value } }))
                          } else {
                            setQuoteData(prev => ({ ...prev, payment: { ...prev.payment, note: e.target.value } }))
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                {/* 노트 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Notes</h3>
                  <textarea
                    value={documentType === 'invoice' ? (invoiceData.notes || '') : (quoteData.notes || '')}
                    onChange={e => {
                      if (documentType === 'invoice') {
                        setInvoiceData(prev => ({ ...prev, notes: e.target.value }))
                      } else {
                        setQuoteData(prev => ({ ...prev, notes: e.target.value }))
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* 미리보기 및 발송 */}
            <div className="space-y-6">
              {/* 발송 폼 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Send {documentType === 'invoice' ? 'Invoice' : 'Quote'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email</label>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={e => setRecipientEmail(e.target.value)}
                      placeholder={(documentType === 'invoice' ? invoiceData.billing.email : quoteData.billing.email) || "customer@example.com"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to use billing email: {documentType === 'invoice' ? invoiceData.billing.email : quoteData.billing.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Add a custom message to the email..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                    />
                  </div>
                  <button
                    onClick={() => void handleSendInvoice()}
                    disabled={isSending}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send {documentType === 'invoice' ? 'Invoice' : 'Quote'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 문서 미리보기 */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">{documentType === 'invoice' ? 'Invoice' : 'Quote'} Preview</h3>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download PDF
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto">
                  <div
                    ref={invoiceRef}
                    data-invoice-root
                    style={{ overflow: 'visible' }}
                    className="min-w-[768px]"
                  >
                    {documentType === 'invoice' ? (
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
                    ) : (
                      <QuoteTemplate
                        company={quoteData.company}
                        billing={quoteData.billing}
                        quoteMeta={quoteData.quoteMeta}
                        items={quoteData.items}
                        totals={quoteData.totals}
                        discounts={quoteData.discounts}
                        shipping={quoteData.shipping}
                        paymentFee={quoteData.paymentFee}
                        payment={quoteData.payment}
                        notes={quoteData.notes}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    </AdminRoute>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import InvoiceTemplate, { InvoiceLineItem, InvoiceTemplateProps } from '@/components/invoice/InvoiceTemplate'
import { ArrowLeft, Save, Eye, Plus, Trash2, Download, Loader2 } from 'lucide-react'
import AdminPageHeader from '@/components/AdminPageHeader'
import AdminRoute from '@/components/AdminRoute'
import { COMPANY_LEGAL, COMPANY_BANK, COMPANY_CONTACT, COMPANY_LOGO_URL } from '@/lib/companyLegal'

const STORAGE_KEY = 'invoice-template-data'

const defaultInvoiceData: Omit<InvoiceTemplateProps, 'items' | 'totals'> & {
  items: InvoiceLineItem[]
  totals: { subtotal: number; tax: number; total: number; currency: string }
} = {
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
    companyName: '',
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '0400 000 000',
    address: '45 Market Street,\nSydney NSW 2000'
  },
  invoiceMeta: {
    invoiceNumber: 'INV-2025-001',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference: '1234' // 간략한 형식: 주문 ID에서 "ORD-" 접두사 제거
  },
  items: [
    { description: 'Custom Stickers (Premium Gloss)', qty: 2, unitPrice: 25, taxRate: 0.1 },
    { description: 'Stamp Product (Self-inking)', qty: 1, unitPrice: 32, taxRate: 0.1 },
    { description: 'Shipping (Standard)', qty: 1, unitPrice: 10, taxRate: 0 }
  ],
  totals: { subtotal: 92, tax: 8.2, total: 100.2, currency: 'AUD' },
  payment: {
    bank: COMPANY_BANK.bankName,
    accountName: COMPANY_BANK.accountName,
    bsb: COMPANY_BANK.bsb,
    account: COMPANY_BANK.accountNumber,
    note: COMPANY_BANK.paymentNote
  },
  notes: `Thank you for your business! We bring your ideas to life.\nPayment is due within 7 days. Late payments may incur a 2% monthly fee.`
}

export default function InvoiceEditPage() {
  const router = useRouter()
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [isPreview, setIsPreview] = useState(false)
  const [invoiceData, setInvoiceData] = useState(defaultInvoiceData)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // 로컬 스토리지에서 데이터 로드
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setInvoiceData(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load saved invoice data:', e)
      }
    }
  }, [])

  // 합계 자동 계산
  useEffect(() => {
    const subtotal = invoiceData.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
    const tax = invoiceData.items.reduce(
      (sum, item) => sum + (item.taxRate ? item.unitPrice * item.qty * item.taxRate : 0),
      0
    )
    const total = subtotal + tax
    setInvoiceData(prev => ({
      ...prev,
      totals: { ...prev.totals, subtotal, tax, total }
    }))
  }, [invoiceData.items])

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoiceData))
    alert('Invoice template saved successfully!')
  }

  const handleAddItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { description: 'New Item', qty: 1, unitPrice: 0, taxRate: 0.1 }]
    }))
  }

  const handleRemoveItem = (index: number) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return

    setIsGeneratingPDF(true)
    try {
      // html2pdf.js를 동적으로 로드
      const html2pdf = (await import('html2pdf.js')).default

      const element = invoiceRef.current
      
      // 전체 콘텐츠가 렌더링되도록 약간의 지연
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 실제 높이와 너비 계산 (패딩/마진 포함)
      const rect = element.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(element)
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0
      const marginTop = parseFloat(computedStyle.marginTop) || 0
      const marginBottom = parseFloat(computedStyle.marginBottom) || 0
      
      const totalHeight = element.scrollHeight + paddingTop + paddingBottom + marginTop + marginBottom
      const totalWidth = element.scrollWidth
      
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `invoice-${invoiceData.invoiceMeta.invoiceNumber}-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
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
      alert('Failed to generate PDF. Please try again or use the browser print function.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleItemChange = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    }))
  }

  if (isPreview) {
    return (
      <AdminRoute requiredPermissions={['content:read']}>
        <div className="min-h-screen bg-gray-50">
          <AdminPageHeader
            title="Invoice Template Preview"
            icon={<Eye className="w-6 h-6" />}
            showBackButton={true}
            backUrl="/admin/invoices/edit"
            backLabel="Back to Edit"
            showHomepageLink={false}
            showLanguageSelector={false}
          />
          <div className="max-w-4xl mx-auto p-6">
            <div ref={invoiceRef}>
              <InvoiceTemplate {...invoiceData} />
            </div>
            <div className="mt-8 flex justify-center space-x-4">
              <button
                onClick={() => setIsPreview(false)}
                className="px-6 py-2 bg-white border border-gray-300 rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition"
              >
                Back to Edit
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 rounded-md text-sm font-semibold text-white hover:bg-blue-700 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
        </div>
      </AdminRoute>
    )
  }

  return (
    <AdminRoute requiredPermissions={['content:write']}>
      <div className="min-h-screen bg-gray-50">
        <AdminPageHeader
          title="Edit Invoice Template"
          icon={<Save className="w-6 h-6" />}
          showBackButton={true}
          backUrl="/admin/invoices/preview"
          backLabel="Preview"
          showHomepageLink={false}
          showLanguageSelector={false}
        />

        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 편집 폼 */}
            <div className="space-y-6">
              {/* 회사 정보 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Company Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={invoiceData.company.name}
                      onChange={e => setInvoiceData(prev => ({ ...prev, company: { ...prev.company, name: e.target.value } }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ABN</label>
                      <input
                        type="text"
                        value={invoiceData.company.abn || ''}
                        onChange={e => setInvoiceData(prev => ({ ...prev, company: { ...prev.company, abn: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ACN</label>
                      <input
                        type="text"
                        value={invoiceData.company.acn || ''}
                        onChange={e => setInvoiceData(prev => ({ ...prev, company: { ...prev.company, acn: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      value={invoiceData.company.address || ''}
                      onChange={e => setInvoiceData(prev => ({ ...prev, company: { ...prev.company, address: e.target.value } }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="text"
                        value={invoiceData.company.phone || ''}
                        onChange={e => setInvoiceData(prev => ({ ...prev, company: { ...prev.company, phone: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={invoiceData.company.email || ''}
                        onChange={e => setInvoiceData(prev => ({ ...prev, company: { ...prev.company, email: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 청구 정보 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Billing Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name <span className="text-gray-400 text-xs">(if billing a business)</span>
                    </label>
                    <input
                      type="text"
                      value={invoiceData.billing.companyName || ''}
                      onChange={e =>
                        setInvoiceData(prev => ({
                          ...prev,
                          billing: { ...prev.billing, companyName: e.target.value }
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g. ABC Cleaning Services Pty Ltd"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={invoiceData.billing.name}
                      onChange={e => setInvoiceData(prev => ({ ...prev, billing: { ...prev.billing, name: e.target.value } }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      value={invoiceData.billing.address || ''}
                      onChange={e => setInvoiceData(prev => ({ ...prev, billing: { ...prev.billing, address: e.target.value } }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={invoiceData.billing.email || ''}
                        onChange={e => setInvoiceData(prev => ({ ...prev, billing: { ...prev.billing, email: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="text"
                        value={invoiceData.billing.phone || ''}
                        onChange={e => setInvoiceData(prev => ({ ...prev, billing: { ...prev.billing, phone: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 인보이스 메타 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Invoice Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                    <input
                      type="text"
                      value={invoiceData.invoiceMeta.invoiceNumber}
                      onChange={e =>
                        setInvoiceData(prev => ({
                          ...prev,
                          invoiceMeta: { ...prev.invoiceMeta, invoiceNumber: e.target.value }
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                      <input
                        type="date"
                        value={invoiceData.invoiceMeta.issueDate}
                        onChange={e =>
                          setInvoiceData(prev => ({
                            ...prev,
                            invoiceMeta: { ...prev.invoiceMeta, issueDate: e.target.value }
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={invoiceData.invoiceMeta.dueDate || ''}
                        onChange={e =>
                          setInvoiceData(prev => ({
                            ...prev,
                            invoiceMeta: { ...prev.invoiceMeta, dueDate: e.target.value }
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                    <input
                      type="text"
                      value={invoiceData.invoiceMeta.reference || ''}
                      onChange={e =>
                        setInvoiceData(prev => ({
                          ...prev,
                          invoiceMeta: { ...prev.invoiceMeta, reference: e.target.value }
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* 품목 */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Line Items</h3>
                  <button
                    onClick={handleAddItem}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                  >
                    <Plus size={16} />
                    Add Item
                  </button>
                </div>
                <div className="space-y-4">
                  {invoiceData.items.map((item, index) => (
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
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                          <textarea
                            value={item.description}
                            onChange={e => handleItemChange(index, 'description', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm resize-y"
                            rows={2}
                            placeholder="Product or service name, plus any extra details (you can use line breaks)."
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                            <input
                              type="number"
                              value={item.qty}
                              onChange={e => handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                              min="0"
                              step="1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price</label>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={e => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Tax Rate (%)</label>
                            <input
                              type="number"
                              value={((item.taxRate || 0) * 100).toFixed(0)}
                              onChange={e =>
                                handleItemChange(index, 'taxRate', parseFloat(e.target.value) / 100 || 0)
                              }
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                              min="0"
                              max="100"
                              step="1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 결제 정보 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                    <input
                      type="text"
                      value={invoiceData.payment?.bank || ''}
                      onChange={e =>
                        setInvoiceData(prev => ({
                          ...prev,
                          payment: { ...prev.payment, bank: e.target.value }
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name (받는이)</label>
                    <input
                      type="text"
                      value={invoiceData.payment?.accountName || ''}
                      onChange={e =>
                        setInvoiceData(prev => ({
                          ...prev,
                          payment: { ...prev.payment, accountName: e.target.value }
                        }))
                      }
                      placeholder="e.g. SELPIC PTY LTD"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">BSB</label>
                      <input
                        type="text"
                        value={invoiceData.payment?.bsb || ''}
                        onChange={e =>
                          setInvoiceData(prev => ({
                            ...prev,
                            payment: { ...prev.payment, bsb: e.target.value }
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                      <input
                        type="text"
                        value={invoiceData.payment?.account || ''}
                        onChange={e =>
                          setInvoiceData(prev => ({
                            ...prev,
                            payment: { ...prev.payment, account: e.target.value }
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Note</label>
                    <textarea
                      value={invoiceData.payment?.note || ''}
                      onChange={e =>
                        setInvoiceData(prev => ({
                          ...prev,
                          payment: { ...prev.payment, note: e.target.value }
                        }))
                      }
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
                  value={invoiceData.notes || ''}
                  onChange={e => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={4}
                  placeholder="Enter notes or terms..."
                />
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-4">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 shadow-md transition"
                >
                  <Save size={20} />
                  Save Template
                </button>
                <button
                  onClick={() => setIsPreview(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 shadow-md transition"
                >
                  <Eye size={20} />
                  Preview
                </button>
              </div>
            </div>

            {/* 실시간 프리뷰 */}
            <div className="lg:sticky lg:top-6 h-fit">
              <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
                <h3 className="text-lg font-semibold mb-2">Live Preview</h3>
                <p className="text-sm text-gray-600">Changes are reflected in real-time</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-[calc(100vh-200px)]">
                <div ref={invoiceRef}>
                  <InvoiceTemplate {...invoiceData} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </AdminRoute>
    )
  }


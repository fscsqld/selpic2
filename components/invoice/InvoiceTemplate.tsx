'use client'

import React from 'react'

export interface InvoiceLineItem {
  description: string
  qty: number
  unitPrice: number
  taxRate?: number
}

export interface InvoiceTemplateProps {
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
  billing: {
    // 개인 청구 시: name만 사용 (개인 이름)
    // 회사 청구 시: companyName + name(담당자) 함께 사용
    companyName?: string
    /** 고객 회사 ABN (법인 고객일 때) */
    companyAbn?: string
    /** 청소/서비스 현장 주소 (Billing 주소와 다를 수 있음) */
    serviceAddress?: string
    /** 청소/서비스 일자 (YYYY-MM-DD) */
    serviceDate?: string
    name: string
    email?: string
    phone?: string
    address?: string
  }
  invoiceMeta: {
    invoiceNumber: string
    issueDate: string
    dueDate?: string
    reference?: string
  }
  items: InvoiceLineItem[]
  totals: {
    subtotal: number
    tax?: number
    total: number
    currency?: string
  }
  discounts?: {
    totalDiscount?: number
    vipDiscount?: number
    promoDiscount?: number
    promoCode?: string
  }
  shipping?: number
  paymentFee?: number
  payment?: {
    bank?: string
    accountName?: string  // 받는이 / 계좌명
    bsb?: string
    account?: string
    note?: string
    other?: string
  }
  notes?: string
}

const currencyFormat = (value: number, currency = 'AUD') =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(value)

// 날짜 포맷팅 헬퍼 (DD Mon YYYY - 호주 표준)
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  } catch {
    return dateString
  }
}

export default function InvoiceTemplate({
  company,
  billing,
  invoiceMeta,
  items,
  totals,
  discounts,
  shipping,
  paymentFee,
  payment,
  notes
}: InvoiceTemplateProps) {
  // 전체 items에서 Tax Rate가 0이 아닌 항목이 있는지 확인
  const hasGST = items.some(item => item.taxRate && item.taxRate > 0)
  
  // 품목별 금액 계산
  // Tax Rate가 0이 아닐 때는 GST 제외 금액만 반환, 0일 때는 GST 포함 총액 반환
  const calculateItemTotal = (item: InvoiceLineItem) => {
    const subtotalExclGST = item.unitPrice * item.qty
    const tax = item.taxRate ? subtotalExclGST * item.taxRate : 0
    
    // Tax Rate가 0이 아닐 때는 GST 제외 금액만 반환 (GST는 별도로 표시)
    if (item.taxRate && item.taxRate > 0) {
      return subtotalExclGST
    }
    
    // Tax Rate가 0일 때는 GST 포함 총액 반환 (현재 로직 유지)
    return subtotalExclGST + tax
  }
  
  // Unit Price 표시용 함수
  // Tax Rate가 0이 아닐 때는 GST 제외 가격 그대로, 0일 때는 GST 포함 가격
  const getDisplayPrice = (item: InvoiceLineItem) => {
    // Tax Rate가 0이 아닐 때는 GST 제외 가격 그대로 표시
    if (item.taxRate && item.taxRate > 0) {
      return item.unitPrice
    }
    
    // Tax Rate가 0일 때는 GST 포함 가격 표시 (현재 로직 유지)
    return item.unitPrice * (1 + (item.taxRate || 0))
  }

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-lg overflow-hidden border border-gray-200 font-sans">
      {/* 헤더 섹션 */}
      <div className="p-8 border-b border-gray-100 flex justify-between items-start">
        <div>
          {company.logoUrl && (
            <div className="mb-4">
              <img
                src={company.logoUrl}
                alt={company.name}
                className="h-20 w-auto object-contain max-w-[360px]"
              />
            </div>
          )}
          <h1 className="text-3xl font-black text-blue-900 tracking-tighter">{company.name}</h1>
          {/* Australian format: ABN then ACN (required on tax invoices) */}
          <div className="text-xs text-gray-600 mt-1 space-y-0.5">
            {company.abn && <p>ABN: {company.abn}</p>}
            {company.acn && <p>ACN: {company.acn}</p>}
          </div>
          {company.address && (
            <div className="mt-4 text-sm text-gray-600 leading-relaxed">
              {company.address.split('\n').map((line, idx) => (
                <React.Fragment key={idx}>
                  {line}
                  {idx < company.address!.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          )}
          {(company.phone || company.email) && (
            <p className="text-sm text-gray-600 mt-1">
              {company.phone && <span>{company.phone}</span>}
              {company.phone && company.email && <span className="mx-2">|</span>}
              {company.email && <span>{company.email}</span>}
            </p>
          )}
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-light text-gray-300 uppercase tracking-widest mb-6">Tax Invoice</h2>
          <div className="space-y-1.5 text-sm">
            <p>
              <span className="text-gray-400 font-medium">Invoice No:</span>{' '}
              <span className="font-bold text-gray-800">#{invoiceMeta.invoiceNumber}</span>
            </p>
            <p>
              <span className="text-gray-400 font-medium">Issue Date:</span>{' '}
              <span className="text-gray-800">{formatDate(invoiceMeta.issueDate)}</span>
            </p>
            {invoiceMeta.dueDate && (
              <p>
                <span className="text-red-400 font-medium">Due Date:</span>{' '}
                <span className="font-bold text-red-600 underline">
                  {formatDate(invoiceMeta.dueDate)} (Net 7)
                </span>
              </p>
            )}
            {invoiceMeta.reference && (
              <p>
                <span className="text-gray-400 font-medium">Reference:</span>{' '}
                <span className="text-gray-800 font-semibold">#{invoiceMeta.reference}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 청구 정보 섹션 */}
      <div className="p-8 grid grid-cols-2 gap-12 bg-gray-50/50 border-b border-gray-100">
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Bill To</h3>
          {billing.companyName && (
            <p className="font-bold text-gray-800 text-lg">{billing.companyName}</p>
          )}
          {billing.companyAbn && (
            <p className="text-gray-600 text-sm mt-1">
              <span className="font-semibold text-gray-700">ABN:</span> {billing.companyAbn}
            </p>
          )}
          {/* Contact person is optional. If empty, do not render a placeholder like "Customer". */}
          {Boolean((billing.name || '').trim()) && (
            <p className={`font-semibold text-gray-800 ${billing.companyName ? 'text-sm mt-1' : 'text-lg'}`}>
              {billing.companyName ? `Attn: ${billing.name}` : billing.name}
            </p>
          )}
          {billing.address && (
            <p className="text-gray-600 text-sm mt-1">
              {billing.address.split('\n').map((line, idx) => (
                <React.Fragment key={idx}>
                  {line}
                  {idx < billing.address!.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          )}
          {(billing.phone || billing.email) && (
            <p className="text-gray-600 text-sm mt-2">
              {billing.phone ? <span>{billing.phone}</span> : null}
              {billing.phone && billing.email ? <span className="mx-2 text-gray-300">|</span> : null}
              {billing.email ? <span>{billing.email}</span> : null}
            </p>
          )}
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Payment Details</h3>
          <div className="space-y-1 text-sm text-gray-700">
            {payment?.bank && (
              <p className="whitespace-nowrap">
                <span className="font-semibold w-24 inline-block align-baseline">Bank:</span> {payment.bank}
              </p>
            )}
            {payment?.accountName && (
              <p className="whitespace-nowrap">
                <span className="font-semibold w-24 inline-block align-baseline">Account Name:</span> {payment.accountName}
              </p>
            )}
            {payment?.bsb && (
              <p className="whitespace-nowrap">
                <span className="font-semibold w-24 inline-block align-baseline">BSB:</span> {payment.bsb}
              </p>
            )}
            {payment?.account && (
              <p className="whitespace-nowrap">
                <span className="font-semibold w-24 inline-block align-baseline">Account:</span> {payment.account}
              </p>
            )}
            {payment?.note && (
              <p className="text-xs text-blue-600 mt-3 font-medium italic">
                * {payment.note}
              </p>
            )}
            {payment?.other && (
              <p className="mt-2">{payment.other}</p>
            )}
            {!payment && (
              <p className="text-gray-600">Add payment instructions here.</p>
            )}
          </div>
        </div>
      </div>

      {/* 품목 테이블 */}
      <div className="p-8">
        {(billing.serviceAddress || billing.serviceDate) && (
          <div className="mb-4 text-sm text-gray-700">
            {billing.serviceAddress && (
              <div>
                <span className="font-semibold text-gray-800">Service Address:</span>{' '}
                <span className="text-gray-700">
                  {billing.serviceAddress.split('\n').map((line, idx) => (
                    <React.Fragment key={idx}>
                      {line}
                      {idx < billing.serviceAddress!.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </span>
              </div>
            )}
            {billing.serviceDate && (
              <div className="mt-1">
                <span className="font-semibold text-gray-800">Service Date:</span> {formatDate(billing.serviceDate)}
              </div>
            )}
          </div>
        )}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Unit Price</th>
              <th className="py-4 text-right text-xs font-bold text-gray-300 uppercase tracking-wider">GST</th>
              <th className="py-4 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => {
              const itemTotal = calculateItemTotal(item)
              return (
                <tr key={`${item.description}-${idx}`}>
                  <td className="py-5 text-sm text-gray-800 font-semibold">
                    {item.description.split('\n').map((line, lineIdx, arr) => (
                      <React.Fragment key={lineIdx}>
                        {line}
                        {lineIdx < arr.length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </td>
                  <td className="py-5 text-center text-sm text-gray-600">{item.qty}</td>
                  <td className="py-5 text-right text-sm text-gray-600">
                    {currencyFormat(getDisplayPrice(item), totals.currency)}
                  </td>
                  <td className="py-5 text-right text-sm text-gray-400">
                    {item.taxRate ? `${(item.taxRate * 100).toFixed(0)}%` : '-'}
                  </td>
                  <td className="py-5 text-right text-sm text-gray-900 font-bold">
                    {currencyFormat(itemTotal, totals.currency)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 합계 섹션 */}
      <div className="p-8 pt-0 flex justify-end">
        <div className="w-72 space-y-3 bg-gray-50 p-6 rounded-xl border border-gray-100">
          {/* 상품 Subtotal - GST가 있으면 제외, 없으면 포함 */}
          {hasGST ? (
            <>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal (excl. GST)</span>
                <span>{currencyFormat(totals.subtotal, totals.currency)}</span>
              </div>
              {/* GST (별도 계산) */}
              {totals.tax !== undefined && 
               totals.tax !== null && 
               typeof totals.tax === 'number' && 
               !isNaN(totals.tax) && 
               totals.tax > 0.01 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>GST (10%)</span>
                  <span>{currencyFormat(totals.tax, totals.currency)}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal (incl. GST)</span>
                <span>{currencyFormat(totals.subtotal + (totals.tax || 0), totals.currency)}</span>
              </div>
            </>
          )}
          
          {/* 할인 섹션 */}
          {discounts && discounts.totalDiscount && discounts.totalDiscount > 0 && (
            <>
              {discounts.vipDiscount && discounts.vipDiscount > 0 && (
                <div className="flex justify-between text-sm text-purple-600">
                  <span>VIP Discount</span>
                  <span className="font-semibold">-{currencyFormat(discounts.vipDiscount, totals.currency)}</span>
                </div>
              )}
              {discounts.promoDiscount && discounts.promoDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>
                    Promo Discount{discounts.promoCode ? ` (${discounts.promoCode})` : ''}
                  </span>
                  <span className="font-semibold">-{currencyFormat(discounts.promoDiscount, totals.currency)}</span>
                </div>
              )}
              {(!discounts.vipDiscount || discounts.vipDiscount === 0) && 
               (!discounts.promoDiscount || discounts.promoDiscount === 0) && 
               discounts.totalDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span className="font-semibold">-{currencyFormat(discounts.totalDiscount, totals.currency)}</span>
                </div>
              )}
            </>
          )}
          
          {/* Shipping (값이 있고 0보다 클 때만 표시) */}
          {typeof shipping === 'number' && shipping > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Shipping</span>
              <span>{currencyFormat(shipping, totals.currency)}</span>
            </div>
          )}
          
          {/* Payment Fee (값이 있고 0보다 클 때만 표시) */}
          {typeof paymentFee === 'number' && paymentFee > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Payment Fee</span>
              <span>{currencyFormat(paymentFee, totals.currency)}</span>
            </div>
          )}
          
          {/* 최종 합계 */}
          <div className="flex justify-between text-xl font-black text-blue-900 border-t border-gray-200 pt-3">
            <span>Total Due</span>
            <span>{currencyFormat(totals.total, totals.currency)}</span>
          </div>
        </div>
      </div>

      {/* 노트 섹션 */}
      {notes && (
        <div className="p-6 bg-white text-xs text-gray-600 border-t border-gray-100">
          <p className="font-semibold text-gray-700 mb-2 uppercase tracking-tighter">Notes</p>
          <div className="space-y-1">
            {notes.split('\n').filter(line => line.trim()).map((line, idx) => (
              <p key={idx}>{line.trim()}</p>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}


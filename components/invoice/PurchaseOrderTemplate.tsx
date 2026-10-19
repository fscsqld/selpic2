'use client'

import React from 'react'
import {
  DEFAULT_PO_WAYBILL_INSTRUCTIONS,
  OVERSEAS_ZERO_RATED_DISCLAIMER,
  PO_KR_FORWARDER_ZERO_RATED_NOTE,
  PO_KR_HUB_UI_NOTICES,
  PO_WAYBILL_CHECKLIST,
  packUnitLabel,
  shipmentMethodLabel,
  taxRuleLabel,
  type PoLabelLocale,
  type PurchaseOrderDoc,
} from '@/lib/purchaseOrderTypes'
import { formatPoMoney, lineAmount } from '@/lib/purchaseOrderTotals'

function formatDate(dateString: string): string {
  if (!dateString) return '—'
  try {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return dateString
    const day = date.getDate()
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  } catch {
    return dateString
  }
}

function L({
  locale,
  en,
  ko,
}: {
  locale: PoLabelLocale
  en: string
  ko: string
}): string {
  return locale === 'ko' ? ko : en
}

export type PurchaseOrderTemplateProps = {
  doc: PurchaseOrderDoc
}

export default function PurchaseOrderTemplate({ doc }: PurchaseOrderTemplateProps) {
  const locale = doc.poMeta.labelLocale || 'en'
  const currency = doc.payment.currency
  const incotermLine =
    doc.trade.incoterm === 'Custom'
      ? doc.trade.namedPlace || 'Custom'
      : `${doc.trade.incoterm}${doc.trade.namedPlace ? ` ${doc.trade.namedPlace}` : ''}`

  const showZeroDisclaimer = doc.taxRule === 'overseas_zero'

  return (
    <div
      data-po-root
      className="bg-white text-gray-900 w-full max-w-[210mm] mx-auto shadow-sm"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Header */}
      <div className="px-8 py-7 border-b-4 border-slate-800 flex justify-between gap-8">
        <div className="min-w-0 flex-1">
          {doc.buyer.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doc.buyer.logoUrl}
              alt={doc.buyer.name}
              className="h-14 w-auto object-contain max-w-[280px] mb-3"
              onError={(e) => {
                const el = e.currentTarget
                if (el.dataset.fallback === '1') {
                  el.style.display = 'none'
                  return
                }
                el.dataset.fallback = '1'
                el.src = '/images/logo.png'
              }}
            />
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{doc.buyer.name}</h1>
          <div className="text-xs text-slate-600 mt-1 space-y-0.5">
            {doc.buyer.abn ? <p>ABN: {doc.buyer.abn}</p> : null}
            {doc.buyer.acn ? <p>ACN: {doc.buyer.acn}</p> : null}
          </div>
          {doc.buyer.address ? (
            <p className="text-sm text-slate-600 mt-2 whitespace-pre-line leading-relaxed">
              {doc.buyer.address}
            </p>
          ) : null}
          <div className="text-sm text-slate-600 mt-1 space-y-0.5">
            {doc.buyer.phone ? <p>{doc.buyer.phone}</p> : null}
            {doc.buyer.email ? <p className="break-all">{doc.buyer.email}</p> : null}
          </div>
        </div>

        <div className="text-right shrink-0 w-[42%]">
          <h2 className="text-3xl font-bold text-slate-800 tracking-wide uppercase">
            {L({ locale, en: 'Purchase Order', ko: '발주서' })}
          </h2>
          {locale === 'ko' ? (
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Purchase Order</p>
          ) : null}
          <div className="mt-5 space-y-1.5 text-sm text-left bg-slate-50 border border-slate-200 rounded-md p-3">
            <p>
              <span className="text-slate-500 font-medium">
                {L({ locale, en: 'PO No.', ko: '발주번호' })}:
              </span>{' '}
              <span className="font-bold text-slate-900">{doc.poMeta.poNumber}</span>
            </p>
            <p>
              <span className="text-slate-500 font-medium">
                {L({ locale, en: 'Issue Date', ko: '발행일' })}:
              </span>{' '}
              <span className="text-slate-800">{formatDate(doc.poMeta.issueDate)}</span>
            </p>
            {doc.poMeta.requiredShipDate ? (
              <p>
                <span className="text-slate-500 font-medium">
                  {L({ locale, en: 'Required Ship / Delivery', ko: '요구 선적·납기' })}:
                </span>{' '}
                <span className="text-slate-800 font-semibold">
                  {formatDate(doc.poMeta.requiredShipDate)}
                </span>
              </p>
            ) : null}
            <p>
              <span className="text-slate-500 font-medium">Incoterms:</span>{' '}
              <span className="text-slate-800 font-semibold">{incotermLine}</span>
            </p>
            <p>
              <span className="text-slate-500 font-medium">
                {L({ locale, en: 'Shipment', ko: '운송' })}:
              </span>{' '}
              <span className="text-slate-800">
                {shipmentMethodLabel(doc.trade.shipmentMethod, locale)}
              </span>
            </p>
            <p>
              <span className="text-slate-500 font-medium">
                {L({ locale, en: 'Payment', ko: '결제조건' })}:
              </span>{' '}
              <span className="text-slate-800 text-xs leading-snug block mt-0.5">
                {doc.payment.termsText || '—'}
              </span>
            </p>
            {doc.poMeta.supplierQuoteRef ? (
              <p>
                <span className="text-slate-500 font-medium">
                  {L({ locale, en: 'Supplier Quote / PI Ref', ko: '견적·PI 참조' })}:
                </span>{' '}
                <span className="text-slate-800 font-semibold">{doc.poMeta.supplierQuoteRef}</span>
              </p>
            ) : null}
            {(doc.poMeta.revision ?? 0) > 0 ? (
              <p>
                <span className="text-slate-500 font-medium">Revision:</span>{' '}
                <span className="text-slate-800">R{doc.poMeta.revision}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Parties */}
      <div className="px-8 py-6 grid grid-cols-2 gap-8 border-b border-slate-100 bg-slate-50/40">
        <div>
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
            {L({ locale, en: 'Vendor (Supplier)', ko: '공급사 (Vendor)' })}
          </h3>
          <p className="font-bold text-slate-900 text-lg">{doc.vendor.name || '—'}</p>
          {doc.vendor.vatOrBizReg ? (
            <p className="text-sm text-slate-600 mt-1">
              {L({ locale, en: 'Biz / VAT Reg', ko: '사업자·VAT' })}: {doc.vendor.vatOrBizReg}
            </p>
          ) : null}
          {doc.vendor.contactPerson ? (
            <p className="text-sm text-slate-700 mt-1">
              {L({ locale, en: 'Attn', ko: '담당' })}: {doc.vendor.contactPerson}
            </p>
          ) : null}
          {doc.vendor.address ? (
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{doc.vendor.address}</p>
          ) : null}
          <div className="text-sm text-slate-600 mt-2 space-y-0.5">
            {doc.vendor.phone ? <p>{doc.vendor.phone}</p> : null}
            {doc.vendor.email ? <p className="break-all">{doc.vendor.email}</p> : null}
          </div>
        </div>
        <div className="space-y-5">
          <div>
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              {L({ locale, en: 'Bill To / Consignee', ko: '청구·수하인' })}
            </h3>
            <p className="font-bold text-slate-900">{doc.billTo.name}</p>
            {doc.billTo.abn ? <p className="text-sm text-slate-600">ABN: {doc.billTo.abn}</p> : null}
            {doc.billTo.address ? (
              <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{doc.billTo.address}</p>
            ) : null}
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              {L({ locale, en: 'Ship To', ko: '배송지' })}
            </h3>
            <p className="text-sm text-slate-800 whitespace-pre-line">
              {doc.shipTo.address || '—'}
            </p>
            {doc.shipTo.mode === 'forwarder_kr' && doc.taxRule === 'overseas_zero' ? (
              <p className="mt-2 text-[10px] text-amber-900 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 leading-relaxed">
                {PO_KR_FORWARDER_ZERO_RATED_NOTE}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Waybill & box marking — Korean hub only (under Ship To) */}
      {doc.shipTo.mode === 'forwarder_kr' ? (
        <div className="px-8 py-5 border-b border-slate-100 bg-amber-50/50">
          <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-2">
            {L({
              locale,
              en: 'Waybill & Box Marking Instructions',
              ko: '운송장·박스 마킹 지침',
            })}
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-800 mb-3">
            <p>
              <span className="font-semibold">
                {L({ locale, en: 'Consignee (Hub)', ko: '수하인(허브)' })}:
              </span>{' '}
              {doc.shipTo.hubCompanyName || '—'}
            </p>
            <p>
              <span className="font-semibold">
                {L({ locale, en: 'Hub contact', ko: '허브 담당' })}:
              </span>{' '}
              {[doc.shipTo.hubContactPerson, doc.shipTo.hubPhone].filter(Boolean).join(' · ') ||
                '—'}
            </p>
            <p className="col-span-2">
              <span className="font-semibold">
                {L({ locale, en: 'Waybill / box reference', ko: '운송장·박스 참조' })}:
              </span>{' '}
              <span className="font-bold">{doc.poMeta.poNumber}</span>
              <span className="text-xs text-slate-500 ml-2">
                e.g. [{doc.poMeta.poNumber} / SELPIC / Box 1 of 6 (AIR)]
              </span>
            </p>
            {doc.shipTo.waybillGuideUrl ? (
              <p className="col-span-2 text-xs break-all">
                <span className="font-semibold">
                  {L({ locale, en: 'Waybill guide', ko: '작성 가이드' })}:
                </span>{' '}
                {doc.shipTo.waybillGuideUrl}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5 text-[10px] text-slate-800 leading-snug mb-3">
            <p>
              <strong>Consignee:</strong> {PO_KR_HUB_UI_NOTICES.consignee}
            </p>
            <p>
              <strong>PO reference:</strong> {PO_KR_HUB_UI_NOTICES.poReference}
            </p>
            <p>
              <strong>Box marking:</strong> {PO_KR_HUB_UI_NOTICES.boxMarking}
            </p>
            <p>
              <strong>Zero-rated:</strong> {PO_KR_HUB_UI_NOTICES.zeroRated}
            </p>
          </div>
          <p className="text-[10px] text-slate-600 whitespace-pre-line leading-relaxed mb-2 border-t border-amber-100 pt-2">
            {doc.waybillInstructions?.instructionText?.trim() || DEFAULT_PO_WAYBILL_INSTRUCTIONS}
          </p>
          <ul className="text-[10px] text-slate-700 space-y-0.5 list-none">
            {PO_WAYBILL_CHECKLIST.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="shrink-0">☐</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Items */}
      <div className="px-8 py-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="text-left py-2.5 px-2 font-semibold w-10">#</th>
              <th className="text-left py-2.5 px-2 font-semibold">
                {L({ locale, en: 'Description', ko: '품목' })}
              </th>
              <th className="text-left py-2.5 px-2 font-semibold w-24">SKU</th>
              <th className="text-left py-2.5 px-2 font-semibold w-24">
                {L({ locale, en: 'Unit', ko: '단위' })}
              </th>
              <th className="text-right py-2.5 px-2 font-semibold w-16">
                {L({ locale, en: 'Qty', ko: '수량' })}
              </th>
              <th className="text-right py-2.5 px-2 font-semibold w-24">
                {L({ locale, en: 'Unit Price', ko: '단가' })}
              </th>
              <th className="text-right py-2.5 px-2 font-semibold w-28">
                {L({ locale, en: 'Amount', ko: '금액' })}
              </th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((item, idx) => (
              <tr key={`${item.lineNo}-${idx}`} className="border-b border-slate-100 align-top">
                <td className="py-3 px-2 text-slate-500">{item.lineNo || idx + 1}</td>
                <td className="py-3 px-2">
                  <p className="font-medium text-slate-900 whitespace-pre-line">
                    {item.descriptionEn || '—'}
                  </p>
                  {item.descriptionKo ? (
                    <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-line">
                      {item.descriptionKo}
                    </p>
                  ) : null}
                  {item.lineNote ? (
                    <p className="text-xs text-slate-600 mt-1 italic">Note: {item.lineNote}</p>
                  ) : null}
                  {(item.countryOfOrigin || item.hsCode) && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      {[
                        item.countryOfOrigin ? `COO: ${item.countryOfOrigin}` : null,
                        item.hsCode ? `HS: ${item.hsCode}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </td>
                <td className="py-3 px-2 text-slate-700 break-all">{item.sku || '—'}</td>
                <td className="py-3 px-2 text-slate-700">{packUnitLabel(item.packUnit, locale)}</td>
                <td className="py-3 px-2 text-right text-slate-800">{item.qty}</td>
                <td className="py-3 px-2 text-right text-slate-800">
                  {formatPoMoney(item.unitPrice, currency)}
                </td>
                <td className="py-3 px-2 text-right font-semibold text-slate-900">
                  {formatPoMoney(lineAmount(item), currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-72 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>{L({ locale, en: 'Goods Subtotal', ko: '상품 소계' })}</span>
              <span>{formatPoMoney(doc.totals.subtotal, currency)}</span>
            </div>
            {(Number(doc.charges.freight) || 0) > 0 ? (
              <div className="flex justify-between text-slate-600">
                <span>{L({ locale, en: 'Freight', ko: '운임' })}</span>
                <span>{formatPoMoney(Number(doc.charges.freight) || 0, currency)}</span>
              </div>
            ) : null}
            {(Number(doc.charges.insurance) || 0) > 0 ? (
              <div className="flex justify-between text-slate-600">
                <span>{L({ locale, en: 'Insurance', ko: '보험' })}</span>
                <span>{formatPoMoney(Number(doc.charges.insurance) || 0, currency)}</span>
              </div>
            ) : null}
            {(Number(doc.charges.other) || 0) > 0 ? (
              <div className="flex justify-between text-slate-600">
                <span>{doc.charges.otherLabel || L({ locale, en: 'Other', ko: '기타' })}</span>
                <span>{formatPoMoney(Number(doc.charges.other) || 0, currency)}</span>
              </div>
            ) : null}
            {doc.taxRule !== 'overseas_zero' ? (
              <div className="flex justify-between text-slate-600">
                <span>
                  {L({ locale, en: 'Tax (GST)', ko: '세금 (GST)' })} ·{' '}
                  {taxRuleLabel(doc.taxRule, locale)}
                </span>
                <span>{formatPoMoney(doc.totals.tax, currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between pt-2 border-t-2 border-slate-800 text-base font-bold text-slate-900">
              <span>{L({ locale, en: 'Grand Total', ko: '합계' })} ({currency})</span>
              <span>{formatPoMoney(doc.totals.total, currency)}</span>
            </div>
          </div>
        </div>

        {showZeroDisclaimer ? (
          <p className="mt-4 text-xs text-slate-600 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 leading-relaxed">
            {OVERSEAS_ZERO_RATED_DISCLAIMER}
          </p>
        ) : null}
      </div>

      {/* Notes & T&C */}
      {(doc.notes || doc.termsAndConditions) && (
        <div className="px-8 pb-6 space-y-4">
          {doc.notes ? (
            <div>
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                {L({ locale, en: 'Notes', ko: '비고' })}
              </h3>
              <p className="text-sm text-slate-700 whitespace-pre-line">{doc.notes}</p>
            </div>
          ) : null}
          {doc.termsAndConditions ? (
            <div>
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                {L({ locale, en: 'Terms & Conditions', ko: '거래 조건' })}
              </h3>
              <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                {doc.termsAndConditions}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Footer: Supplier bank (left) · Buyer signatory + Supplier acknowledgement (right) */}
      <div className="px-8 py-6 border-t border-slate-200 grid grid-cols-2 gap-8 items-start">
        <div>
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
            {L({
              locale,
              en: 'Supplier Bank Account (Remit To)',
              ko: '공급사 입금 계좌 (송금처)',
            })}
          </h3>
          <p className="text-[10px] text-amber-800 mb-2">
            {L({
              locale,
              en: 'SELPIC remits payment TO this supplier account (not SELPIC receiving account).',
              ko: 'SELPIC이 이 공급사 계좌로 송금합니다 (SELPIC 수신 계좌 아님).',
            })}
          </p>
          <div className="text-sm text-slate-700 space-y-1">
            <p>
              <span className="font-semibold inline-block w-28">
                {L({ locale, en: 'Account Name', ko: '예금주' })}:
              </span>
              {doc.payment.supplierBank.accountName || '—'}
            </p>
            <p>
              <span className="font-semibold inline-block w-28">
                {L({ locale, en: 'Bank', ko: '은행' })}:
              </span>
              {doc.payment.supplierBank.bankName || '—'}
            </p>
            <p>
              <span className="font-semibold inline-block w-28">SWIFT / Acct:</span>
              <span className="break-all">{doc.payment.supplierBank.swiftOrAccount || '—'}</span>
            </p>
            <p>
              <span className="font-semibold inline-block w-28">
                {L({ locale, en: 'Reference', ko: '입금 참조' })}:
              </span>
              <span className="font-bold">{doc.poMeta.poNumber}</span>
            </p>
            {doc.payment.supplierBank.note ? (
              <p className="text-xs text-slate-500 mt-1">{doc.payment.supplierBank.note}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              {L({ locale, en: 'Authorized Signatory', ko: '발주 승인' })}
            </h3>
            <p className="text-sm font-semibold text-slate-800 mb-3">SELPIC PTY LTD</p>
            {doc.signatureImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={doc.signatureImageUrl}
                alt="Authorized signature"
                className="h-14 w-auto max-w-[200px] object-contain mb-2"
              />
            ) : (
              <div className="h-14 border-b border-slate-400 mb-2 w-48" />
            )}
            <p className="text-xs text-slate-500">
              {L({ locale, en: 'Signature / Date', ko: '서명 / 일자' })}: ________________
            </p>
          </div>

          {/* Bottom-right supplier confirmation box (approved checklist) */}
          <div className="border border-slate-300 rounded-md p-3 bg-slate-50">
            <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-2">
              {L({ locale, en: 'Supplier Acknowledgement', ko: '공급사 수락 확인' })}
            </h3>
            <p className="text-sm text-slate-700 mb-3">
              {L({
                locale,
                en: 'Accepted & Confirmed by Supplier:',
                ko: '공급사 수락 및 확인:',
              })}
            </p>
            <div className="space-y-2 text-sm text-slate-700">
              <p>
                {L({ locale, en: 'Signature', ko: '서명' })}: ______________________
              </p>
              <p>
                {L({ locale, en: 'Date', ko: '일자' })}: _______________
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

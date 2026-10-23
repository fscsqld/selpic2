'use client'

import React from 'react'
import {
  OVERSEAS_ZERO_RATED_DISCLAIMER,
  PO_PAYMENT_REMITTANCE_NOTE,
  formatIncotermLine,
  normalizeSupplierBank,
  packUnitLabel,
  shipmentMethodLabel,
  taxRuleLabel,
  type PoLabelLocale,
  type PurchaseOrderDoc,
} from '@/lib/purchaseOrderTypes'
import { syncCartonMarkingToPoNumber } from '@/lib/poHubPresets'
import {
  formatPoPersonName,
  resolveBillToDisplay,
} from '@/lib/poDisplayNormalize'
import { formatPoMoney, lineAmount } from '@/lib/purchaseOrderTotals'
import PoHubInstructionCard from '@/components/invoice/PoHubInstructionCard'

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
  const incotermLine = formatIncotermLine(doc.trade.incoterm, doc.trade.namedPlace)
  const supplierBank = normalizeSupplierBank(doc.payment.supplierBank)
  const remittanceNote =
    supplierBank.note?.trim() || PO_PAYMENT_REMITTANCE_NOTE

  const showZeroDisclaimer = doc.taxRule === 'overseas_zero'
  const billTo = resolveBillToDisplay(doc.billTo)
  const cartonMarking = syncCartonMarkingToPoNumber(
    doc.shipTo.cartonMarking,
    doc.shipTo.destinationIdentifier,
    doc.poMeta.poNumber
  )
  const vendorAttn = formatPoPersonName(doc.vendor.contactPerson)

  return (
    <div
      data-po-root
      className="bg-white text-gray-900 w-full max-w-[210mm] mx-auto shadow-sm"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Header — logo uses buyer.logoUrl (COMPANY_LOGO_URL /logo.png); do not pull CMS header-logo */}
      <div className="px-8 py-4 border-b-4 border-slate-800 flex justify-between items-start gap-6">
        <div className="min-w-0 flex-1">
          {doc.buyer.logoUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.buyer.logoUrl}
                alt=""
                className="h-9 max-h-9 w-auto object-contain max-w-[200px] mb-2"
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
              <p className="text-[13px] font-semibold text-slate-900 tracking-tight leading-tight">
                {doc.buyer.name}
              </p>
            </>
          ) : (
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mb-1">
              {doc.buyer.name}
            </h1>
          )}
          {/* Secondary identity — smaller than company name so PURCHASE ORDER stays dominant */}
          <div className="text-[11px] text-slate-600 mt-1 space-y-0.5 leading-snug">
            {doc.buyer.abn || doc.buyer.acn ? (
              <p>
                {[
                  doc.buyer.abn ? `ABN: ${doc.buyer.abn}` : null,
                  doc.buyer.acn ? `ACN: ${doc.buyer.acn}` : null,
                ]
                  .filter(Boolean)
                  .join(' / ')}
              </p>
            ) : null}
            {doc.buyer.address ? (
              <p className="whitespace-pre-line">{doc.buyer.address}</p>
            ) : null}
            {doc.buyer.phone ? <p>{doc.buyer.phone}</p> : null}
            {doc.buyer.email ? <p className="break-all">{doc.buyer.email}</p> : null}
          </div>
        </div>

        {/*
          Right stack: title + meta share the same left edge (avoids title flush-right
          while the box starts further left). Column still sits on the page’s right half.
        */}
        <div className="shrink-0 w-[46%] text-left">
          <h2 className="text-[24px] font-bold text-slate-800 tracking-[0.06em] uppercase leading-none whitespace-nowrap">
            {L({ locale, en: 'Purchase Order', ko: '발주서' })}
          </h2>
          {locale === 'ko' ? (
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Purchase Order</p>
          ) : null}
          <div className="mt-2.5 w-full space-y-1 text-[13px] bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 leading-snug">
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
              {/* Long clause: one step below meta 13px; matches T&C body (~11px), still PDF-legible */}
              <span className="text-[11px] text-slate-700 leading-snug block mt-0.5 font-normal">
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
      <div className="px-8 py-4 grid grid-cols-2 gap-8 border-b border-slate-100 bg-slate-50/40">
        <div>
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            {L({ locale, en: 'Vendor (Supplier)', ko: '공급사 (Vendor)' })}
          </h3>
          <p className="font-bold text-slate-900 text-lg leading-tight">{doc.vendor.name || '—'}</p>
          {doc.vendor.vatOrBizReg ? (
            <p className="text-[12px] text-slate-600 mt-1 leading-snug">
              {L({ locale, en: 'Biz / VAT Reg', ko: '사업자·VAT' })}: {doc.vendor.vatOrBizReg}
            </p>
          ) : null}
          {vendorAttn ? (
            <p className="text-[12px] text-slate-700 mt-1 leading-snug">
              {L({ locale, en: 'Attn', ko: '담당' })}: {vendorAttn}
            </p>
          ) : null}
          {doc.vendor.address ? (
            <p className="text-[12px] text-slate-600 mt-1 whitespace-pre-line leading-snug">
              {doc.vendor.address}
            </p>
          ) : null}
          <div className="text-[12px] text-slate-600 mt-1.5 space-y-0.5 leading-snug">
            {doc.vendor.phone ? <p>{doc.vendor.phone}</p> : null}
            {doc.vendor.email ? <p className="break-all">{doc.vendor.email}</p> : null}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              {L({ locale, en: 'Bill To / Consignee', ko: '청구·수하인' })}
            </h3>
            <p className="font-bold text-slate-900 text-lg leading-tight">{billTo.name}</p>
            {billTo.abn || billTo.acn ? (
              <p className="text-[12px] text-slate-600 mt-0.5 leading-snug">
                {[
                  billTo.abn ? `ABN: ${billTo.abn}` : null,
                  billTo.acn ? `ACN: ${billTo.acn}` : null,
                ]
                  .filter(Boolean)
                  .join(' / ')}
              </p>
            ) : null}
            {doc.billTo.address ? (
              <p className="text-[12px] text-slate-600 mt-1 whitespace-pre-line leading-snug">
                {doc.billTo.address}
              </p>
            ) : null}
          </div>
          {/* KR forwarder: address lives only in the bordered hub box below (no duplicate plain Ship To). */}
          {doc.shipTo.mode !== 'forwarder_kr' ? (
            <div>
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                {L({ locale, en: 'Ship To', ko: '배송지' })}
              </h3>
              <p className="text-sm text-slate-800 whitespace-pre-line">
                {doc.shipTo.address || '—'}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Domestic hub shipping + carton marking — Korean hub only */}
      {doc.shipTo.mode === 'forwarder_kr' ? (
        <div className="px-8 py-3 border-b border-slate-100 bg-amber-50/50">
          <PoHubInstructionCard
            forwarderName={doc.shipTo.forwarderName}
            transportMode={doc.shipTo.transportMode}
            recipientName={doc.shipTo.hubCompanyName || ''}
            phone={doc.shipTo.hubPhone || ''}
            address={doc.shipTo.address}
            cartonMarking={cartonMarking}
          />
        </div>
      ) : null}

      {/* Items */}
      <div className="px-8 py-4">
        <table className="w-full text-sm border-collapse" style={{ lineHeight: 1.35 }}>
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="text-left py-2 px-2 font-semibold w-8">#</th>
              <th className="text-left py-2 px-2 font-semibold">
                {L({ locale, en: 'Description', ko: '품목' })}
              </th>
              <th className="text-left py-2 px-2 font-semibold w-[7.5rem] whitespace-nowrap">
                SKU
              </th>
              <th className="text-left py-2 px-2 font-semibold w-16 whitespace-nowrap">
                {L({ locale, en: 'Unit', ko: '단위' })}
              </th>
              <th className="text-right py-2 px-2 font-semibold w-12">
                {L({ locale, en: 'Qty', ko: '수량' })}
              </th>
              <th className="text-right py-2 px-2 font-semibold w-[6.5rem] whitespace-nowrap">
                {L({ locale, en: 'Unit Price', ko: '단가' })}
              </th>
              <th className="text-right py-2 px-2 font-semibold w-[6.5rem] whitespace-nowrap">
                {L({ locale, en: 'Amount', ko: '금액' })}
              </th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((item, idx) => (
              <tr key={`${item.lineNo}-${idx}`} className="border-b border-slate-100 align-top">
                <td className="py-2 px-2 text-slate-500">{item.lineNo || idx + 1}</td>
                <td className="py-2 px-2">
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
                        item.countryOfOrigin
                          ? `Country of Origin: ${item.countryOfOrigin}`
                          : null,
                        item.hsCode ? `HS: ${item.hsCode}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </td>
                <td className="py-2 px-2 text-slate-700 whitespace-nowrap font-mono text-[12px]">
                  {item.sku || '—'}
                </td>
                <td className="py-2 px-2 text-slate-700 whitespace-nowrap">
                  {packUnitLabel(item.packUnit, locale)}
                </td>
                <td className="py-2 px-2 text-right text-slate-800 whitespace-nowrap">{item.qty}</td>
                <td className="py-2 px-2 text-right text-slate-800 whitespace-nowrap">
                  {formatPoMoney(item.unitPrice, currency)}
                </td>
                <td className="py-2 px-2 text-right font-semibold text-slate-900 whitespace-nowrap">
                  {formatPoMoney(lineAmount(item), currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-72 space-y-1 text-sm">
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
          <p className="mt-3 text-xs text-slate-600 bg-amber-50 border border-amber-100 rounded-md px-3 py-1.5 leading-relaxed">
            {OVERSEAS_ZERO_RATED_DISCLAIMER}
          </p>
        ) : null}
      </div>

      {/* Notes & T&C — kept near totals to reduce orphan page-2 whitespace */}
      {(doc.notes || doc.termsAndConditions) && (
        <div className="px-8 pb-3 space-y-3">
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
              <p className="text-[11px] text-slate-600 whitespace-pre-line leading-snug">
                {doc.termsAndConditions.replace(/^Terms\s*&\s*Conditions\s*\n+/i, '')}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Footer: full-width bank, then balanced 2-column signatures */}
      <div className="px-8 py-4 border-t border-slate-200">
        <div>
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            {L({
              locale,
              en: 'Supplier Bank Account (Remit To)',
              ko: '공급사 입금 계좌 (송금처)',
            })}
          </h3>
          <p className="text-[10px] text-amber-800 mb-2.5 leading-snug">
            {L({
              locale,
              en: 'SELPIC remits payment TO this supplier account (not SELPIC receiving account).',
              ko: 'SELPIC이 이 공급사 계좌로 송금합니다 (SELPIC 수신 계좌 아님).',
            })}
          </p>
          <table className="w-full text-[12.5px] text-slate-700 border-collapse">
            <tbody>
              {(
                [
                  {
                    label: L({ locale, en: 'Bank Name', ko: '은행' }),
                    value: (supplierBank.bankName || '').trim(),
                  },
                  {
                    label: L({ locale, en: 'Account Name / Holder', ko: '예금주' }),
                    value: (supplierBank.accountName || '').trim(),
                    nowrap: true,
                  },
                  {
                    label: L({ locale, en: 'Account No. / IBAN', ko: '계좌번호' }),
                    value: (supplierBank.accountNumber || '').trim(),
                  },
                  {
                    label: 'SWIFT / BIC',
                    value: (supplierBank.swiftBic || '').trim(),
                  },
                  {
                    label: L({ locale, en: 'Bank Code / Branch', ko: '은행코드·지점' }),
                    value: (supplierBank.bankCodeOrBranch || '').trim(),
                  },
                  {
                    label: L({ locale, en: 'Reference', ko: '입금 참조' }),
                    value: doc.poMeta.poNumber,
                    bold: true,
                    always: true,
                  },
                ] as {
                  label: string
                  value: string
                  nowrap?: boolean
                  bold?: boolean
                  always?: boolean
                }[]
              )
                .filter((row) => row.always || Boolean(row.value))
                .map((row) => (
                  <tr key={row.label} className="border-b border-slate-100 last:border-b-0">
                    <th
                      scope="row"
                      className="py-2 pr-6 text-left font-semibold text-slate-500 align-middle whitespace-nowrap w-[12rem] text-[12px]"
                    >
                      {row.label}
                    </th>
                    <td
                      className={
                        'py-2 align-middle ' +
                        (row.bold ? 'font-bold text-slate-900 text-[13px] ' : 'text-slate-800 ') +
                        (row.nowrap ? 'whitespace-nowrap' : 'break-words')
                      }
                    >
                      {row.value || '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="text-[11px] text-amber-900 mt-3 leading-snug border border-amber-100 bg-amber-50/80 rounded px-3 py-2">
            {remittanceNote}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 items-stretch mt-5 pt-4 border-t border-slate-100">
          <div className="flex flex-col">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              {L({ locale, en: 'Authorized Signatory', ko: '발주 승인' })}
            </h3>
            <p className="text-[13px] font-semibold text-slate-800 mb-2">SELPIC PTY LTD</p>
            {doc.signatureImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={doc.signatureImageUrl}
                alt="Authorized signature"
                className="h-11 w-auto max-w-[200px] object-contain mb-2 mt-1"
              />
            ) : (
              <div className="h-11 border-b border-slate-400 mb-2 mt-1 w-52" />
            )}
            <p className="text-[11px] text-slate-500 mt-auto pt-1">
              {L({ locale, en: 'Signature / Date', ko: '서명 / 일자' })}: ________________
            </p>
          </div>

          <div className="border border-slate-300 rounded-md px-4 py-3.5 bg-slate-50 flex flex-col">
            <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-2">
              {L({ locale, en: 'Supplier Acknowledgement', ko: '공급사 수락 확인' })}
            </h3>
            <p className="text-[13px] text-slate-700 mb-3 leading-snug">
              {L({
                locale,
                en: 'Accepted & Confirmed by Supplier:',
                ko: '공급사 수락 및 확인:',
              })}
            </p>
            <div className="space-y-2.5 text-[13px] text-slate-700 mt-auto">
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

      <p className="px-8 pb-3 text-[9px] text-slate-400 text-right">
        {doc.poMeta.poNumber}
      </p>
    </div>
  )
}

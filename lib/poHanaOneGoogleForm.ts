/**
 * Hana One Express Google Form prefill for PO domestic-shipping handoff.
 *
 * Entry IDs are form-specific. Paste them from Google Forms → ⋮ → Get pre-filled link,
 * or set NEXT_PUBLIC_HANA_ONE_* env vars. Stored overrides live in localStorage
 * (`selpic-hana-one-google-form`).
 */

import { COMPANY_CONTACT, COMPANY_LEGAL } from './companyLegal'
import { carrierLabel } from './poDomesticCarriers'
import type { PurchaseOrderDoc } from './purchaseOrderTypes'
import { formatPoMoney } from './purchaseOrderTotals'

export const HANA_ONE_FORM_STORAGE_KEY = 'selpic-hana-one-google-form'

export type HanaOneGoogleFormConfig = {
  /** e.g. https://docs.google.com/forms/d/e/1FAIpQL…/viewform */
  viewFormUrl: string
  entryRecipientName: string
  entryRecipientPhone: string
  entryRecipientEmail: string
  entryPackageInfo: string
  entryDeliveryAddress: string
  entryDeliveryOption: string
  entryKrCustoms: string
  entryAuCustoms: string
}

/** Empty until configured — UI still works; Open Form stays gated on logistics + URL. */
export const EMPTY_HANA_ONE_FORM_CONFIG: HanaOneGoogleFormConfig = {
  viewFormUrl: '',
  entryRecipientName: '',
  entryRecipientPhone: '',
  entryRecipientEmail: '',
  entryPackageInfo: '',
  entryDeliveryAddress: '',
  entryDeliveryOption: '',
  entryKrCustoms: '',
  entryAuCustoms: '',
}

export function loadHanaOneFormConfig(): HanaOneGoogleFormConfig {
  const fromEnv: HanaOneGoogleFormConfig = {
    viewFormUrl: (process.env.NEXT_PUBLIC_HANA_ONE_GOOGLE_FORM_URL || '').trim(),
    entryRecipientName: (process.env.NEXT_PUBLIC_HANA_ONE_ENTRY_RECIPIENT_NAME || '').trim(),
    entryRecipientPhone: (process.env.NEXT_PUBLIC_HANA_ONE_ENTRY_RECIPIENT_PHONE || '').trim(),
    entryRecipientEmail: (process.env.NEXT_PUBLIC_HANA_ONE_ENTRY_RECIPIENT_EMAIL || '').trim(),
    entryPackageInfo: (process.env.NEXT_PUBLIC_HANA_ONE_ENTRY_PACKAGE_INFO || '').trim(),
    entryDeliveryAddress: (process.env.NEXT_PUBLIC_HANA_ONE_ENTRY_DELIVERY_ADDRESS || '').trim(),
    entryDeliveryOption: (process.env.NEXT_PUBLIC_HANA_ONE_ENTRY_DELIVERY_OPTION || '').trim(),
    entryKrCustoms: (process.env.NEXT_PUBLIC_HANA_ONE_ENTRY_KR_CUSTOMS || '').trim(),
    entryAuCustoms: (process.env.NEXT_PUBLIC_HANA_ONE_ENTRY_AU_CUSTOMS || '').trim(),
  }

  if (typeof window === 'undefined') return fromEnv

  try {
    const raw = window.localStorage.getItem(HANA_ONE_FORM_STORAGE_KEY)
    if (!raw) return fromEnv
    const parsed = JSON.parse(raw) as Partial<HanaOneGoogleFormConfig>
    return {
      viewFormUrl: (parsed.viewFormUrl || fromEnv.viewFormUrl || '').trim(),
      entryRecipientName: (parsed.entryRecipientName || fromEnv.entryRecipientName || '').trim(),
      entryRecipientPhone: (parsed.entryRecipientPhone || fromEnv.entryRecipientPhone || '').trim(),
      entryRecipientEmail: (parsed.entryRecipientEmail || fromEnv.entryRecipientEmail || '').trim(),
      entryPackageInfo: (parsed.entryPackageInfo || fromEnv.entryPackageInfo || '').trim(),
      entryDeliveryAddress: (parsed.entryDeliveryAddress || fromEnv.entryDeliveryAddress || '').trim(),
      entryDeliveryOption: (parsed.entryDeliveryOption || fromEnv.entryDeliveryOption || '').trim(),
      entryKrCustoms: (parsed.entryKrCustoms || fromEnv.entryKrCustoms || '').trim(),
      entryAuCustoms: (parsed.entryAuCustoms || fromEnv.entryAuCustoms || '').trim(),
    }
  } catch {
    return fromEnv
  }
}

export function saveHanaOneFormConfig(config: HanaOneGoogleFormConfig): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(HANA_ONE_FORM_STORAGE_KEY, JSON.stringify(config))
}

export function isHanaOneFormConfigured(config: HanaOneGoogleFormConfig): boolean {
  return Boolean(config.viewFormUrl && config.entryPackageInfo)
}

/** Digits-only AU mobile for form (+61466894279). */
export function formatHanaOneRecipientPhone(
  phone: string = COMPANY_CONTACT.phone
): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('61')) return `+${digits}`
  if (digits.startsWith('0')) return `+61${digits.slice(1)}`
  return digits ? `+${digits}` : '+61466894279'
}

export function buildPoItemsSummary(doc: PurchaseOrderDoc, maxLen = 80): string {
  const lines = (doc.items || []).filter((i) => (i.descriptionEn || '').trim())
  if (!lines.length) return 'No items'
  if (lines.length === 1) {
    const one = lines[0]
    const s = `${one.descriptionEn.trim()} × ${one.qty}`
    return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s
  }
  const first = lines[0].descriptionEn.trim().slice(0, 40)
  return `${first}… (+${lines.length - 1} more)`
}

export function buildHanaOnePackageInfo(input: {
  carrierCode: string
  trackingNo: string
  itemsSummary: string
  total: number
  currency: string
}): string {
  const carrier = carrierLabel(input.carrierCode)
  const track = (input.trackingNo || '').trim()
  const total = formatPoMoney(input.total, input.currency as 'KRW' | 'USD' | 'AUD' | 'EUR')
  return `${carrier} ${track} / ${input.itemsSummary} / Total: ${total}`
}

export type HanaOnePrefillPayload = {
  recipientName: string
  recipientPhone: string
  recipientEmail: string
  packageInfo: string
  deliveryAddress: string
  deliveryOption: string
  krCustoms: string
  auCustoms: string
}

export function buildDefaultHanaOnePrefillPayload(input: {
  carrierCode: string
  trackingNo: string
  doc: PurchaseOrderDoc
}): HanaOnePrefillPayload {
  return {
    recipientName: COMPANY_LEGAL.companyName,
    recipientPhone: formatHanaOneRecipientPhone(),
    recipientEmail: COMPANY_CONTACT.email,
    packageInfo: buildHanaOnePackageInfo({
      carrierCode: input.carrierCode,
      trackingNo: input.trackingNo,
      itemsSummary: buildPoItemsSummary(input.doc),
      total: input.doc.totals.total,
      currency: input.doc.payment.currency,
    }),
    deliveryAddress: COMPANY_CONTACT.address,
    deliveryOption: '배송 요청',
    krCustoms: '수출 면장 대행 요청',
    auCustoms: '정식 수입 신고',
  }
}

/**
 * Build Google Form prefill URL. Returns null if viewFormUrl is missing.
 * Only appends entry.* params that have both an entry id and a value.
 */
export function buildHanaOnePrefillUrl(
  config: HanaOneGoogleFormConfig,
  payload: HanaOnePrefillPayload
): string | null {
  const base = (config.viewFormUrl || '').trim()
  if (!base) return null

  const url = new URL(base.includes('?') ? base : `${base}${base.includes('/viewform') ? '' : ''}`)
  // Normalize to viewform if user pasted formResponse
  if (url.pathname.includes('/formResponse')) {
    url.pathname = url.pathname.replace('/formResponse', '/viewform')
  }

  const pairs: [string, string][] = [
    [config.entryRecipientName, payload.recipientName],
    [config.entryRecipientPhone, payload.recipientPhone],
    [config.entryRecipientEmail, payload.recipientEmail],
    [config.entryPackageInfo, payload.packageInfo],
    [config.entryDeliveryAddress, payload.deliveryAddress],
    [config.entryDeliveryOption, payload.deliveryOption],
    [config.entryKrCustoms, payload.krCustoms],
    [config.entryAuCustoms, payload.auCustoms],
  ]

  for (const [entryId, value] of pairs) {
    const id = (entryId || '').trim()
    if (!id || !value) continue
    const key = id.startsWith('entry.') ? id : `entry.${id}`
    url.searchParams.set(key, value)
  }

  if (!url.searchParams.has('usp')) {
    url.searchParams.set('usp', 'pp_url')
  }

  return url.toString()
}

export function canOpenHanaOneForm(input: {
  carrierCode?: string | null
  trackingNo?: string | null
  logisticsSaved?: boolean
}): boolean {
  const carrier = (input.carrierCode || '').trim()
  const track = (input.trackingNo || '').trim()
  return Boolean(input.logisticsSaved && carrier && track)
}

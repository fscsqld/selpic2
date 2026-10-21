/**
 * Hana One Express Google Form prefill for PO domestic-shipping handoff.
 *
 * Sea and Air use **separate** Google Forms (different viewform URLs / entry IDs).
 * Recipient prefill branches: Sea → 브리즈번해상, Air → 브리즈번항공.
 * Paste from Google Forms → ⋮ → Get pre-filled link, or set env
 * (NEXT_PUBLIC_HANA_ONE_*_SEA / _AIR, or *_FORM_ID / *_FORM_URL).
 * Browser overrides: localStorage `selpic-hana-one-google-form`.
 */

import { COMPANY_CONTACT } from './companyLegal'
import { normalizeHubRecipientForDisplay } from './poDisplayNormalize'
import { carrierLabel } from './poDomesticCarriers'
import type { PurchaseOrderDoc } from './purchaseOrderTypes'
import { formatPoMoney } from './purchaseOrderTotals'

export const HANA_ONE_FORM_STORAGE_KEY = 'selpic-hana-one-google-form'

export type HanaOneFormMode = 'sea' | 'air'

/** Google Form “Recipient Name” defaults (Hana One hub Attn). */
export const HANA_ONE_RECIPIENT_BY_MODE: Record<HanaOneFormMode, string> = {
  sea: '브리즈번해상',
  air: '브리즈번항공',
}

export function hanaOneForwarderLabel(mode: HanaOneFormMode): string {
  return mode === 'air'
    ? 'Hana One Express (Air Freight)'
    : 'Hana One Express (Sea Freight)'
}

/** Build viewform URL from a Google Form ID (or pass through a full URL). */
export function viewFormUrlFromFormId(formIdOrUrl: string): string {
  const raw = (formIdOrUrl || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) {
    return raw.includes('/formResponse')
      ? raw.replace('/formResponse', '/viewform')
      : raw
  }
  const id = raw.replace(/^\/+|\/+$/g, '').replace(/\/viewform$/i, '')
  if (!id) return ''
  return `https://docs.google.com/forms/d/e/${id}/viewform`
}

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

/** Sea + Air mappings (Hana One uses different forms per mode). */
export type HanaOneGoogleFormPair = {
  sea: HanaOneGoogleFormConfig
  air: HanaOneGoogleFormConfig
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

export const EMPTY_HANA_ONE_FORM_PAIR: HanaOneGoogleFormPair = {
  sea: { ...EMPTY_HANA_ONE_FORM_CONFIG },
  air: { ...EMPTY_HANA_ONE_FORM_CONFIG },
}

function trimConfig(
  partial: Partial<HanaOneGoogleFormConfig> | null | undefined,
  fallback: HanaOneGoogleFormConfig = EMPTY_HANA_ONE_FORM_CONFIG
): HanaOneGoogleFormConfig {
  const p = partial || {}
  return {
    viewFormUrl: (p.viewFormUrl || fallback.viewFormUrl || '').trim(),
    entryRecipientName: (p.entryRecipientName || fallback.entryRecipientName || '').trim(),
    entryRecipientPhone: (p.entryRecipientPhone || fallback.entryRecipientPhone || '').trim(),
    entryRecipientEmail: (p.entryRecipientEmail || fallback.entryRecipientEmail || '').trim(),
    entryPackageInfo: (p.entryPackageInfo || fallback.entryPackageInfo || '').trim(),
    entryDeliveryAddress: (p.entryDeliveryAddress || fallback.entryDeliveryAddress || '').trim(),
    entryDeliveryOption: (p.entryDeliveryOption || fallback.entryDeliveryOption || '').trim(),
    entryKrCustoms: (p.entryKrCustoms || fallback.entryKrCustoms || '').trim(),
    entryAuCustoms: (p.entryAuCustoms || fallback.entryAuCustoms || '').trim(),
  }
}

function envPick(...keys: string[]): string {
  for (const key of keys) {
    const v = (process.env[key] || '').trim()
    if (v) return v
  }
  return ''
}

function resolveViewFormUrlFromEnv(mode: HanaOneFormMode): string {
  if (mode === 'air') {
    const url = envPick(
      'NEXT_PUBLIC_HANA_ONE_GOOGLE_FORM_URL_AIR',
      'NEXT_PUBLIC_HANA_ONE_AIR_FORM_URL',
      'NEXT_PUBLIC_HANA_ONE_AIR_FORM_ID',
      'NEXT_PUBLIC_HANA_ONE_GOOGLE_FORM_ID_AIR'
    )
    return viewFormUrlFromFormId(url)
  }
  const url = envPick(
    'NEXT_PUBLIC_HANA_ONE_GOOGLE_FORM_URL_SEA',
    'NEXT_PUBLIC_HANA_ONE_SEA_FORM_URL',
    'NEXT_PUBLIC_HANA_ONE_SEA_FORM_ID',
    'NEXT_PUBLIC_HANA_ONE_GOOGLE_FORM_ID_SEA',
    'NEXT_PUBLIC_HANA_ONE_GOOGLE_FORM_URL'
  )
  return viewFormUrlFromFormId(url)
}

function envConfigForMode(mode: HanaOneFormMode): HanaOneGoogleFormConfig {
  if (mode === 'air') {
    return {
      viewFormUrl: resolveViewFormUrlFromEnv('air'),
      entryRecipientName: envPick('NEXT_PUBLIC_HANA_ONE_ENTRY_RECIPIENT_NAME_AIR'),
      entryRecipientPhone: envPick('NEXT_PUBLIC_HANA_ONE_ENTRY_RECIPIENT_PHONE_AIR'),
      entryRecipientEmail: envPick('NEXT_PUBLIC_HANA_ONE_ENTRY_RECIPIENT_EMAIL_AIR'),
      entryPackageInfo: envPick('NEXT_PUBLIC_HANA_ONE_ENTRY_PACKAGE_INFO_AIR'),
      entryDeliveryAddress: envPick('NEXT_PUBLIC_HANA_ONE_ENTRY_DELIVERY_ADDRESS_AIR'),
      entryDeliveryOption: envPick('NEXT_PUBLIC_HANA_ONE_ENTRY_DELIVERY_OPTION_AIR'),
      entryKrCustoms: envPick('NEXT_PUBLIC_HANA_ONE_ENTRY_KR_CUSTOMS_AIR'),
      entryAuCustoms: envPick('NEXT_PUBLIC_HANA_ONE_ENTRY_AU_CUSTOMS_AIR'),
    }
  }
  // Sea: mode-specific env, then legacy unscoped keys (pre–Sea/Air split).
  return {
    viewFormUrl: resolveViewFormUrlFromEnv('sea'),
    entryRecipientName: envPick(
      'NEXT_PUBLIC_HANA_ONE_ENTRY_RECIPIENT_NAME_SEA',
      'NEXT_PUBLIC_HANA_ONE_ENTRY_RECIPIENT_NAME'
    ),
    entryRecipientPhone: envPick(
      'NEXT_PUBLIC_HANA_ONE_ENTRY_RECIPIENT_PHONE_SEA',
      'NEXT_PUBLIC_HANA_ONE_ENTRY_RECIPIENT_PHONE'
    ),
    entryRecipientEmail: envPick(
      'NEXT_PUBLIC_HANA_ONE_ENTRY_RECIPIENT_EMAIL_SEA',
      'NEXT_PUBLIC_HANA_ONE_ENTRY_RECIPIENT_EMAIL'
    ),
    entryPackageInfo: envPick(
      'NEXT_PUBLIC_HANA_ONE_ENTRY_PACKAGE_INFO_SEA',
      'NEXT_PUBLIC_HANA_ONE_ENTRY_PACKAGE_INFO'
    ),
    entryDeliveryAddress: envPick(
      'NEXT_PUBLIC_HANA_ONE_ENTRY_DELIVERY_ADDRESS_SEA',
      'NEXT_PUBLIC_HANA_ONE_ENTRY_DELIVERY_ADDRESS'
    ),
    entryDeliveryOption: envPick(
      'NEXT_PUBLIC_HANA_ONE_ENTRY_DELIVERY_OPTION_SEA',
      'NEXT_PUBLIC_HANA_ONE_ENTRY_DELIVERY_OPTION'
    ),
    entryKrCustoms: envPick(
      'NEXT_PUBLIC_HANA_ONE_ENTRY_KR_CUSTOMS_SEA',
      'NEXT_PUBLIC_HANA_ONE_ENTRY_KR_CUSTOMS'
    ),
    entryAuCustoms: envPick(
      'NEXT_PUBLIC_HANA_ONE_ENTRY_AU_CUSTOMS_SEA',
      'NEXT_PUBLIC_HANA_ONE_ENTRY_AU_CUSTOMS'
    ),
  }
}

/**
 * Prefer shipTo.transportMode; else trade.shipmentMethod.
 * Express / unknown → sea (Hana One hub handoff is usually sea or air only).
 */
export function resolveHanaOneFormMode(doc: PurchaseOrderDoc): HanaOneFormMode {
  const hub = doc.shipTo?.transportMode
  if (hub === 'air' || hub === 'sea') return hub
  if (doc.trade?.shipmentMethod === 'air') return 'air'
  return 'sea'
}

/** Normalize localStorage / API JSON into a Sea+Air pair (migrates legacy flat config → sea). */
export function normalizeHanaOneFormPair(raw: unknown): HanaOneGoogleFormPair {
  const envSea = envConfigForMode('sea')
  const envAir = envConfigForMode('air')
  if (!raw || typeof raw !== 'object') {
    return { sea: { ...envSea }, air: { ...envAir } }
  }
  const obj = raw as Record<string, unknown>
  if (obj.sea || obj.air) {
    return {
      sea: trimConfig(obj.sea as Partial<HanaOneGoogleFormConfig>, envSea),
      air: trimConfig(obj.air as Partial<HanaOneGoogleFormConfig>, envAir),
    }
  }
  // Legacy single-form blob → Sea only (Air must be configured separately).
  if (typeof obj.viewFormUrl === 'string' || typeof obj.entryPackageInfo === 'string') {
    return {
      sea: trimConfig(obj as Partial<HanaOneGoogleFormConfig>, envSea),
      air: { ...envAir },
    }
  }
  return { sea: { ...envSea }, air: { ...envAir } }
}

export function loadHanaOneFormPair(): HanaOneGoogleFormPair {
  const fromEnv: HanaOneGoogleFormPair = {
    sea: envConfigForMode('sea'),
    air: envConfigForMode('air'),
  }
  if (typeof window === 'undefined') return fromEnv
  try {
    const raw = window.localStorage.getItem(HANA_ONE_FORM_STORAGE_KEY)
    if (!raw) return fromEnv
    return normalizeHanaOneFormPair(JSON.parse(raw))
  } catch {
    return fromEnv
  }
}

/** @deprecated Use loadHanaOneFormPair + resolveHanaOneFormMode. Returns Sea config for compat. */
export function loadHanaOneFormConfig(): HanaOneGoogleFormConfig {
  return loadHanaOneFormPair().sea
}

export function saveHanaOneFormPair(pair: HanaOneGoogleFormPair): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    HANA_ONE_FORM_STORAGE_KEY,
    JSON.stringify({
      sea: trimConfig(pair.sea),
      air: trimConfig(pair.air),
    })
  )
}

/** @deprecated Prefer saveHanaOneFormPair. Saves into Sea slot only. */
export function saveHanaOneFormConfig(config: HanaOneGoogleFormConfig): void {
  const pair = loadHanaOneFormPair()
  saveHanaOneFormPair({ ...pair, sea: trimConfig(config) })
}

/** Ready to open when a viewform URL (or Form ID resolved to one) is present. */
export function isHanaOneFormConfigured(config: HanaOneGoogleFormConfig): boolean {
  return Boolean((config.viewFormUrl || '').trim())
}

/**
 * Prefill Recipient Name for Hana One form (not SELPIC AU company name).
 * Prefer hub/destination when it already matches the mode Attn; else mode default.
 */
export function resolveHanaOneRecipientName(
  doc: PurchaseOrderDoc,
  mode: HanaOneFormMode
): string {
  const expected = HANA_ONE_RECIPIENT_BY_MODE[mode]
  const hub = normalizeHubRecipientForDisplay(
    doc.shipTo?.hubCompanyName,
    doc.shipTo?.address
  )
  if (hub === expected) return hub
  const dest = (doc.shipTo?.destinationIdentifier || '').trim()
  if (dest === expected) return dest
  return expected
}

export function getHanaOneFormConfigForDoc(doc: PurchaseOrderDoc): {
  mode: HanaOneFormMode
  config: HanaOneGoogleFormConfig
} {
  const mode = resolveHanaOneFormMode(doc)
  const pair = loadHanaOneFormPair()
  return { mode, config: pair[mode] }
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
  mode?: HanaOneFormMode
}): HanaOnePrefillPayload {
  const mode = input.mode ?? resolveHanaOneFormMode(input.doc)
  return {
    recipientName: resolveHanaOneRecipientName(input.doc, mode),
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
  const base = viewFormUrlFromFormId(config.viewFormUrl)
  if (!base) return null

  const url = new URL(base)
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

export function hanaOneFormModeLabel(mode: HanaOneFormMode): string {
  return mode === 'air' ? 'Air Freight' : 'Sea Freight'
}

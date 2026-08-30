/**
 * Optional acquisition attribution for Fundraising apply (AI agent / UTM).
 * Organic apply (no query params) must omit acquisition entirely.
 */

export const FUNDRAISING_ACQUISITION_STORAGE_KEY = 'selpic_fundraising_acquisition_v1'

export type FundraisingPartnerAcquisition = {
  ref?: string
  targetId?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  capturedAt?: string
}

const MAX_FIELD = 200

function cleanOptional(raw: unknown): string | undefined {
  if (raw == null) return undefined
  const s = String(raw).trim().slice(0, MAX_FIELD)
  return s || undefined
}

/** Build a sparse acquisition object; returns undefined when nothing useful was provided. */
export function normalizeFundraisingAcquisition(
  input: Partial<FundraisingPartnerAcquisition> | Record<string, unknown> | null | undefined
): FundraisingPartnerAcquisition | undefined {
  if (!input || typeof input !== 'object') return undefined

  const ref = cleanOptional((input as FundraisingPartnerAcquisition).ref)
  const targetId = cleanOptional((input as FundraisingPartnerAcquisition).targetId)
  const utmSource = cleanOptional((input as FundraisingPartnerAcquisition).utmSource)
  const utmMedium = cleanOptional((input as FundraisingPartnerAcquisition).utmMedium)
  const utmCampaign = cleanOptional((input as FundraisingPartnerAcquisition).utmCampaign)
  const capturedAt = cleanOptional((input as FundraisingPartnerAcquisition).capturedAt)

  if (!ref && !targetId && !utmSource && !utmMedium && !utmCampaign) {
    return undefined
  }

  const out: FundraisingPartnerAcquisition = {}
  if (ref) out.ref = ref
  if (targetId) out.targetId = targetId
  if (utmSource) out.utmSource = utmSource
  if (utmMedium) out.utmMedium = utmMedium
  if (utmCampaign) out.utmCampaign = utmCampaign
  out.capturedAt = capturedAt || new Date().toISOString()
  return out
}

/** Parse URLSearchParams from /fundraising?ref=&target_id=&utm_* */
export function acquisitionFromSearchParams(
  params: URLSearchParams
): FundraisingPartnerAcquisition | undefined {
  return normalizeFundraisingAcquisition({
    ref: params.get('ref') || undefined,
    targetId: params.get('target_id') || params.get('targetId') || undefined,
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
  })
}

export function readAcquisitionFromSession(): FundraisingPartnerAcquisition | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = sessionStorage.getItem(FUNDRAISING_ACQUISITION_STORAGE_KEY)
    if (!raw) return undefined
    return normalizeFundraisingAcquisition(JSON.parse(raw) as FundraisingPartnerAcquisition)
  } catch {
    return undefined
  }
}

export function writeAcquisitionToSession(acquisition: FundraisingPartnerAcquisition | undefined): void {
  if (typeof window === 'undefined') return
  try {
    if (!acquisition) {
      sessionStorage.removeItem(FUNDRAISING_ACQUISITION_STORAGE_KEY)
      return
    }
    sessionStorage.setItem(FUNDRAISING_ACQUISITION_STORAGE_KEY, JSON.stringify(acquisition))
  } catch {
    // ignore quota / private mode
  }
}

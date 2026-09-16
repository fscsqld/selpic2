/**
 * Internal shipping-label FROM block: company default vs optional factory override.
 * Does not mutate COMPANY_CONTACT — label-only snapshot on the order.
 */

export type ShippingLabelFromOverride = {
  name: string
  streetAddress: string
  streetAddress2?: string
  suburb: string
  state: string
  postcode: string
  country: string
}

export type ShippingLabelFromPrint = {
  name: string
  /** Line under name, e.g. street (+ optional line 2) */
  addressLine1: string
  /** Locality line, e.g. suburb state postcode [, country if not AU] */
  addressLine2: string
}

/** Matches historical label constants (Mansfield packing address). */
export const COMPANY_SHIPPING_LABEL_FROM: ShippingLabelFromPrint = {
  name: 'SELPIC',
  addressLine1: '7 Harvest St',
  addressLine2: 'Mansfield QLD 4122',
}

function isAustralia(country: string): boolean {
  const c = country.trim().toLowerCase()
  return !c || c === 'au' || c === 'aus' || c === 'australia'
}

export function parseShippingLabelFromOverride(
  raw: unknown
): ShippingLabelFromOverride | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const name = String(o.name || '').trim().slice(0, 120)
  const streetAddress = String(o.streetAddress || '').trim().slice(0, 200)
  const streetAddress2 = String(o.streetAddress2 || '').trim().slice(0, 200)
  const suburb = String(o.suburb || '').trim().slice(0, 120)
  const state = String(o.state || '').trim().slice(0, 32)
  const postcode = String(o.postcode || '').trim().slice(0, 20)
  const country = (String(o.country || '').trim() || 'Australia').slice(0, 80)

  if (!streetAddress || !suburb || !state || !postcode) {
    return null
  }
  if (isAustralia(country) && !/^\d{4}$/.test(postcode)) {
    return null
  }

  return {
    name: name || 'SELPIC',
    streetAddress,
    streetAddress2: streetAddress2 || undefined,
    suburb,
    state,
    postcode,
    country,
  }
}

export function validateShippingLabelFromOverrideInput(
  raw: unknown
): { ok: true; value: ShippingLabelFromOverride } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Enter the factory / direct-ship FROM address.' }
  }
  const o = raw as Record<string, unknown>
  const streetAddress = String(o.streetAddress || '').trim()
  const suburb = String(o.suburb || '').trim()
  const state = String(o.state || '').trim()
  const postcode = String(o.postcode || '').trim()
  const country = (String(o.country || '').trim() || 'Australia')

  if (!streetAddress || !suburb || !state || !postcode) {
    return {
      ok: false,
      error: 'FROM street, suburb, state, and postcode are required when using a different sender.',
    }
  }
  if (isAustralia(country) && !/^\d{4}$/.test(postcode)) {
    return { ok: false, error: 'Australian FROM addresses need a 4-digit postcode.' }
  }

  const value = parseShippingLabelFromOverride(raw)
  if (!value) {
    return { ok: false, error: 'Invalid FROM address.' }
  }
  return { ok: true, value }
}

export function formatShippingLabelFromOverride(
  override: ShippingLabelFromOverride
): ShippingLabelFromPrint {
  const line1 = [override.streetAddress, override.streetAddress2].filter(Boolean).join(', ')
  const locality = [override.suburb, override.state, override.postcode].filter(Boolean).join(' ')
  const line2 =
    override.country && !isAustralia(override.country)
      ? `${locality}, ${override.country}`
      : locality
  return {
    name: override.name || 'SELPIC',
    addressLine1: line1,
    addressLine2: line2,
  }
}

/** Resolve PDF FROM from order snapshot (override) or company default. */
export function resolveShippingLabelFromPrint(order: {
  shippingLabelFromOverride?: ShippingLabelFromOverride | null
}): ShippingLabelFromPrint {
  const raw = order.shippingLabelFromOverride
  if (!raw) return COMPANY_SHIPPING_LABEL_FROM
  const parsed = parseShippingLabelFromOverride(raw)
  if (!parsed) return COMPANY_SHIPPING_LABEL_FROM
  return formatShippingLabelFromOverride(parsed)
}

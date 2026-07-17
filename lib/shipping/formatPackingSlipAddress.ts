import type { OrderRecord } from '@/lib/store'

type OrderAddress = OrderRecord['address']

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Prefer structured address fields so packing slips do not reprint locality
 * that was already embedded in `streetAddress` or a legacy `asSingleLine`.
 */
export function formatPackingSlipAddress(address: OrderAddress | undefined | null): string {
  if (!address) return ''

  const street = String(address.streetAddress || '').trim()
  const suburb = String(address.suburb || '').trim()
  const state = String(address.state || '').trim()
  const postcode = String(address.postcode || '').trim()
  const country = String(address.country || '').trim()
  const locality = [suburb, state, postcode].filter(Boolean).join(' ')
  const localityWithCountry = [locality, country].filter(Boolean).join(' ')

  if (street && (suburb || state || postcode)) {
    // Avoid "street already has suburb/state/postcode" + locality again.
    const streetLower = street.toLowerCase()
    const localityAlreadyInStreet =
      (suburb && streetLower.includes(suburb.toLowerCase())) ||
      (postcode && streetLower.includes(postcode)) ||
      (state && new RegExp(`\\b${escapeRegExp(state)}\\b`, 'i').test(street))

    if (localityAlreadyInStreet) {
      const withCountry =
        country && !streetLower.includes(country.toLowerCase())
          ? `${street}, ${country}`
          : street
      return withCountry
    }

    return [street, localityWithCountry].filter(Boolean).join(', ')
  }

  return String(address.asSingleLine || '').trim()
}

/**
 * Packing slips already print the customer name above the address.
 * Strip a leading name when `asSingleLine` / formatted blocks include it (common for Etsy).
 */
export function stripLeadingRecipientName(addressLine: string, customerName: string | undefined): string {
  const line = String(addressLine || '').trim()
  const name = String(customerName || '').trim()
  if (!line || !name) return line

  const pattern = new RegExp(`^${escapeRegExp(name)}\\s*[,\\n-]\\s*`, 'i')
  const stripped = line.replace(pattern, '').trim()
  return stripped || line
}

export function formatPackingSlipShipToLines(order: Pick<OrderRecord, 'customer' | 'address'>): {
  name: string
  addressLine: string
  phone: string
} {
  const name = String(order.customer?.name || '').trim()
  const addressLine = stripLeadingRecipientName(
    formatPackingSlipAddress(order.address),
    name
  )
  const phone = String(order.customer?.phone || '').trim()
  return { name, addressLine, phone }
}

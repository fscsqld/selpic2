/**
 * Customer-facing display name for transactional emails ("Dear …").
 * Normalizes ALL CAPS / mixed "EMMA kim" → "Emma Kim" without inventing names.
 */

function titleCaseToken(token: string): string {
  if (!token) return token
  const lower = token.toLocaleLowerCase('en-AU')
  return lower.charAt(0).toLocaleUpperCase('en-AU') + lower.slice(1)
}

/** Title-case a human name (spaces, hyphens, apostrophes). */
export function formatCustomerDisplayName(
  raw: string | null | undefined,
  fallback = 'Customer'
): string {
  const trimmed = String(raw || '').trim().replace(/\s+/g, ' ')
  if (!trimmed) return fallback

  const parts = trimmed.split(/(\s+)/)
  const out = parts
    .map((part) => {
      if (/^\s+$/.test(part)) return part
      return part
        .split(/([-'])/)
        .map((token) => {
          if (token === '-' || token === "'") return token
          return titleCaseToken(token)
        })
        .join('')
    })
    .join('')

  return out || fallback
}

/**
 * Resolve order greeting name from customer record + email fallback.
 * Email local-parts like `emma.kim` become `Emma Kim`.
 */
export function resolveOrderCustomerGreetingName(customer: {
  name?: string | null
  email?: string | null
} | null | undefined): string {
  const fromName = (customer?.name || '').trim()
  if (fromName) return formatCustomerDisplayName(fromName)

  const local = (customer?.email || '').split('@')[0]?.trim()
  if (local) {
    const asWords = local.replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim()
    return formatCustomerDisplayName(asWords)
  }
  return 'Customer'
}

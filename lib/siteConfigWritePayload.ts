/**
 * Canonical storefront CMS blob is a plain object (partialize shape).
 * Older rows / persist shims used `{ state: { ... } }` or a JSON string.
 */

export function unwrapSiteConfigValue(raw: unknown): Record<string, unknown> | null {
  let value: unknown = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const obj = value as Record<string, unknown>
  const inner = obj.state
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    return inner as Record<string, unknown>
  }
  return obj
}

export function parseSiteConfigWriteBody(
  body: unknown
): { ok: true; value: Record<string, unknown> } | { ok: false; message: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, message: 'Body must be a JSON object.' }
  }
  const raw = (body as { value?: unknown }).value
  if (raw === undefined) {
    return { ok: false, message: 'Missing value.' }
  }
  const value = unwrapSiteConfigValue(raw)
  if (!value) {
    return { ok: false, message: 'value must be a JSON object (not an array).' }
  }
  return { ok: true, value }
}

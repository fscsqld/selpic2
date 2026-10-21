/**
 * Display-only normalizers for Purchase Order PDF / preview.
 * Do not rewrite stored master data — only how values render on the document.
 */

/** Trailing “(SELPIC / …)” often duplicated on Attn when already on the address. */
const SELPIC_PAREN_SUFFIX =
  /\s*\(\s*SELPIC\s*\/\s*[^)]+\)\s*$/i

/**
 * If Attn ends with the same SELPIC paren suffix already present on the address,
 * strip it from Attn so Phone / Address carry the AU contact once.
 */
export function normalizeHubRecipientForDisplay(
  recipientName: string | undefined | null,
  address: string | undefined | null
): string {
  const recipient = (recipientName || '').trim()
  if (!recipient) return '—'
  const addr = (address || '').trim()
  const recipSuffix = recipient.match(SELPIC_PAREN_SUFFIX)?.[0]?.trim()
  if (!recipSuffix) return recipient
  if (addr && SELPIC_PAREN_SUFFIX.test(addr)) {
    return recipient.replace(SELPIC_PAREN_SUFFIX, '').trim() || recipient
  }
  return recipient
}

/** “Name(title)” → “Name (title)” for Attn lines. */
export function formatPoPersonName(name: string | undefined | null): string {
  const raw = (name || '').trim()
  if (!raw) return ''
  return raw.replace(/([^\s(])\(/g, '$1 (')
}

export type BillToDisplay = {
  name: string
  abn: string
  acn: string
}

/**
 * Prefer structured billTo.abn / acn. Also unwrap legacy
 * “SELPIC PTY LTD (ABN: … / ACN: …)” baked into the name field.
 */
export function resolveBillToDisplay(billTo: {
  name?: string
  abn?: string
  acn?: string
}): BillToDisplay {
  const raw = (billTo.name || '').trim()
  let name = raw
  let abn = (billTo.abn || '').trim()
  let acn = (billTo.acn || '').trim()

  const embedded = raw.match(
    /^(.*?)\s*\(\s*ABN:\s*([^)/]+?)(?:\s*\/\s*ACN:\s*([^)]+?))?\s*\)\s*$/i
  )
  if (embedded) {
    name = (embedded[1] || '').trim() || name
    if (!abn && embedded[2]) abn = embedded[2].trim()
    if (!acn && embedded[3]) acn = embedded[3].trim()
  }

  return {
    name: name || '—',
    abn,
    acn,
  }
}

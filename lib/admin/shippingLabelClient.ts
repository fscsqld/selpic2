import type { OrderRecord } from '@/lib/store'
import type { AdminShippingLabelSlot } from '@/lib/shipping/buildAdminShippingLabelPdf'

export function openPdfBase64(b64: string): void {
  if (typeof window === 'undefined') return
  try {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000)
  } catch (e) {
    console.error(e)
    window.alert('Could not open PDF.')
  }
}

/**
 * Generates (or returns cached) internal shipping label via admin API and opens the PDF in a new tab.
 */
export async function openInternalShippingLabelPdf(
  orderId: string,
  options?: {
    force?: boolean
    slot?: AdminShippingLabelSlot
    onOrderMerged?: (order: OrderRecord) => void
  }
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/admin/shipping/auspost/label', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId,
      force: Boolean(options?.force),
      slot: options?.slot ?? 'top-left',
    }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    order?: OrderRecord
    pdfBase64?: string
  }
  if (!res.ok) {
    return { ok: false, error: typeof data.error === 'string' ? data.error : 'Request failed' }
  }
  if (options?.onOrderMerged && data.order) {
    options.onOrderMerged(data.order)
  }
  if (typeof data.pdfBase64 === 'string' && data.pdfBase64) {
    openPdfBase64(data.pdfBase64)
    return { ok: true }
  }
  return { ok: false, error: 'No PDF in response' }
}

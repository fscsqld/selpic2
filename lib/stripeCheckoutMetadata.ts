import type { OrderRecord } from '@/lib/store'

/** Stripe Checkout Session metadata allows at most 50 keys; each value max 500 chars. */
const MAX_CHUNK = 450
const MAX_CHUNKS = 45

export function orderDraftToMetadataChunks(
  orderDraft: Omit<OrderRecord, 'id' | 'createdAtIso'>
): Record<string, string> {
  const json = JSON.stringify(orderDraft)
  const chunks: string[] = []
  for (let i = 0; i < json.length; i += MAX_CHUNK) {
    chunks.push(json.slice(i, i + MAX_CHUNK))
  }
  if (chunks.length > MAX_CHUNKS) {
    throw new Error('Order payload is too large for Stripe metadata. Please reduce cart size or contact support.')
  }
  const meta: Record<string, string> = { od_n: String(chunks.length) }
  chunks.forEach((c, i) => {
    meta[`od_${i}`] = c
  })
  return meta
}

export function parseOrderDraftFromMetadata(
  metadata: Record<string, string | undefined> | null | undefined
): Omit<OrderRecord, 'id' | 'createdAtIso'> | null {
  if (!metadata) return null
  const n = parseInt(metadata.od_n || '0', 10)
  if (!n || n < 1 || n > MAX_CHUNKS) return null
  let json = ''
  for (let i = 0; i < n; i++) {
    json += metadata[`od_${i}`] ?? ''
  }
  try {
    const parsed = JSON.parse(json) as Omit<OrderRecord, 'id' | 'createdAtIso'>
    return parsed
  } catch {
    return null
  }
}

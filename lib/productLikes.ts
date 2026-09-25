/** Normalize / validate catalog product ids for like APIs. */
export function normalizeProductLikeId(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const id = String(raw).trim()
  if (!id || id.length > 128) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null
  return id
}

export function parseProductLikeIdsQuery(raw: string | null | undefined, max = 100): string[] {
  if (!raw || !raw.trim()) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const part of raw.split(',')) {
    const id = normalizeProductLikeId(part)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= max) break
  }
  return out
}

export type ProductLikeCountRow = { productId: string; count: number }

/** Aggregate rows from product_likes into counts by product_id. */
export function aggregateLikeCounts(
  rows: { product_id?: string | null }[] | null | undefined
): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows || []) {
    const id = normalizeProductLikeId(row.product_id)
    if (!id) continue
    map.set(id, (map.get(id) || 0) + 1)
  }
  return map
}

export function sortLikeSummary(
  counts: Map<string, number>
): ProductLikeCountRow[] {
  return [...counts.entries()]
    .map(([productId, count]) => ({ productId, count }))
    .sort((a, b) => b.count - a.count || a.productId.localeCompare(b.productId))
}

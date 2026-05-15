import 'server-only'

import { getEtsyOpenApiXApiKey } from '@/lib/integrations/etsy/etsyEnv'

const BASE = 'https://openapi.etsy.com/v3/application'

type TaxNode = {
  id?: unknown
  name?: unknown
  children?: unknown
}

function walkTaxonomy(
  node: unknown,
  pathParts: string[],
  out: { id: number; name: string; path: string }[]
): void {
  if (!node || typeof node !== 'object') return
  const n = node as TaxNode
  const name = typeof n.name === 'string' ? n.name.trim() : ''
  const idRaw = n.id
  const id = typeof idRaw === 'number' ? idRaw : Number(idRaw)
  const nextPath = name ? [...pathParts, name] : pathParts
  if (name && Number.isFinite(id) && id > 0) {
    out.push({ id, name, path: nextPath.join(' > ') })
  }
  const kids = n.children
  if (Array.isArray(kids)) {
    for (const c of kids) walkTaxonomy(c, nextPath, out)
  }
}

function collectNodes(root: unknown): { id: number; name: string; path: string }[] {
  const out: { id: number; name: string; path: string }[] = []
  if (Array.isArray(root)) {
    for (const n of root) walkTaxonomy(n, [], out)
    return out
  }
  if (root && typeof root === 'object') {
    const r = root as Record<string, unknown>
    const results = r.results
    if (Array.isArray(results)) {
      for (const n of results) walkTaxonomy(n, [], out)
      return out
    }
    const children = r.children
    if (Array.isArray(children)) {
      for (const n of children) walkTaxonomy(n, [], out)
      return out
    }
    walkTaxonomy(root, [], out)
  }
  return out
}

export async function searchSellerTaxonomyLeaves(params: {
  query: string
  limit?: number
}): Promise<{ id: number; name: string; path: string }[]> {
  const apiKey = getEtsyOpenApiXApiKey()
  if (!apiKey) {
    throw new Error('Missing ETSY_CLIENT_ID / ETSY_CLIENT_SECRET for seller taxonomy request (x-api-key).')
  }
  const res = await fetch(`${BASE}/seller-taxonomy/nodes`, {
    headers: { 'x-api-key': apiKey },
    cache: 'no-store',
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Etsy taxonomy ${res.status}: ${text.slice(0, 400)}`)
  }
  const json = JSON.parse(text) as unknown
  const flat = collectNodes(json)
  const q = params.query.trim().toLowerCase()
  if (!q) return flat.slice(0, params.limit ?? 80)
  const scored = flat
    .map((row) => {
      const hay = `${row.path} ${row.name}`.toLowerCase()
      const hit = hay.includes(q)
      return { row, hit, score: hit ? (row.name.toLowerCase().startsWith(q) ? 2 : 1) : 0 }
    })
    .filter((x) => x.hit)
    .sort((a, b) => b.score - a.score)
  const lim = Math.min(200, Math.max(1, params.limit ?? 80))
  return scored.slice(0, lim).map((s) => s.row)
}

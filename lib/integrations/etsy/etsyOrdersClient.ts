import 'server-only'

const BASE = 'https://openapi.etsy.com/v3/application'

async function etsyJson<T>(path: string, accessToken: string, apiKey: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-api-key': apiKey,
    },
    cache: 'no-store',
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Etsy API ${res.status}: ${text.slice(0, 400)}`)
  }
  return JSON.parse(text) as T
}

export type EtsyListResponse<T> = { count?: number; results?: T[] }

/**
 * GET /users/{user_id}/shops returns a single Shop object (OpenAPI: getShopByOwnerUserId),
 * not a paginated `{ results }` envelope. Normalize so callers always see `results`.
 */
function normalizeShopsListBody(body: Record<string, unknown>): EtsyListResponse<Record<string, unknown>> {
  const r = body.results
  if (Array.isArray(r)) {
    return {
      count: typeof body.count === 'number' ? body.count : r.length,
      results: r as Record<string, unknown>[],
    }
  }
  const shopId = body.shop_id ?? body.shopId
  if (shopId != null && String(shopId).trim() !== '') {
    return { count: 1, results: [body] }
  }
  return { count: 0, results: [] }
}

export async function fetchUserShops(
  etsyUserId: string,
  accessToken: string,
  apiKey: string
): Promise<EtsyListResponse<Record<string, unknown>>> {
  const raw = await etsyJson<Record<string, unknown>>(
    `/users/${encodeURIComponent(etsyUserId)}/shops`,
    accessToken,
    apiKey
  )
  return normalizeShopsListBody(raw)
}

export async function fetchShopReceipts(
  shopId: string | number,
  accessToken: string,
  apiKey: string,
  query: Record<string, string>
): Promise<EtsyListResponse<Record<string, unknown>>> {
  const qs = new URLSearchParams(query)
  return etsyJson(`/shops/${encodeURIComponent(String(shopId))}/receipts?${qs.toString()}`, accessToken, apiKey)
}

export async function fetchShopReceipt(
  shopId: string | number,
  receiptId: number,
  accessToken: string,
  apiKey: string
): Promise<Record<string, unknown>> {
  return etsyJson(`/shops/${encodeURIComponent(String(shopId))}/receipts/${receiptId}`, accessToken, apiKey)
}

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

export async function fetchUserShops(
  etsyUserId: string,
  accessToken: string,
  apiKey: string
): Promise<EtsyListResponse<Record<string, unknown>>> {
  return etsyJson(`/users/${encodeURIComponent(etsyUserId)}/shops`, accessToken, apiKey)
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

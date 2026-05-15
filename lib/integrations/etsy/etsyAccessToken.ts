import 'server-only'

import { getEtsyConnection, upsertEtsyConnection } from '@/lib/integrations/etsy/etsyConnectionStore'
import { refreshEtsyAccessToken } from '@/lib/integrations/etsy/etsyOAuth'
import { getEtsyClientId, getEtsyClientSecret, getEtsyOpenApiXApiKey } from '@/lib/integrations/etsy/etsyEnv'

export async function getValidEtsyAccessToken(): Promise<{
  accessToken: string
  apiKey: string
  shopId: string
  shopName: string | null
}> {
  const clientId = getEtsyClientId()
  if (!clientId) throw new Error('Missing ETSY_CLIENT_ID (or legacy ETSY_API_KEY) — Etsy app keystring.')
  const clientSecret = getEtsyClientSecret()
  const xApiKey = getEtsyOpenApiXApiKey()
  if (!xApiKey) {
    throw new Error(
      'Missing ETSY_CLIENT_SECRET — Etsy Open API v3 requires header x-api-key as KEYSTRING:SHARED_SECRET. Set ETSY_CLIENT_SECRET in Vercel / .env.local.'
    )
  }

  const row = await getEtsyConnection()
  if (!row) throw new Error('Etsy is not connected. Complete OAuth from Admin → Integrations.')

  const expires = new Date(row.expires_at).getTime()
  if (Date.now() > expires - 5 * 60 * 1000) {
    const refreshed = await refreshEtsyAccessToken(clientId, row.refresh_token, clientSecret)
    const expiresAt = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString()
    const nextRefresh =
      typeof refreshed.refresh_token === 'string' && refreshed.refresh_token.trim() !== ''
        ? refreshed.refresh_token
        : row.refresh_token
    await upsertEtsyConnection({
      shop_id: row.shop_id,
      shop_name: row.shop_name,
      etsy_user_id: row.etsy_user_id,
      access_token: refreshed.access_token,
      refresh_token: nextRefresh,
      expires_at: expiresAt,
    })
    return {
      accessToken: refreshed.access_token,
      apiKey: xApiKey,
      shopId: row.shop_id,
      shopName: row.shop_name,
    }
  }

  return {
    accessToken: row.access_token,
    apiKey: xApiKey,
    shopId: row.shop_id,
    shopName: row.shop_name,
  }
}

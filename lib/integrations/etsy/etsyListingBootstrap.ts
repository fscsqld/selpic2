import 'server-only'

import {
  fetchShopReturnPolicies,
  fetchShopShippingProfiles,
} from '@/lib/integrations/etsy/etsyOrdersClient'

function pickFirstNumericId(rows: Record<string, unknown>[], keys: string[]): string {
  for (const row of rows) {
    for (const k of keys) {
      const v = row[k]
      if (v != null && String(v).trim() !== '') return String(v)
    }
  }
  return ''
}

export function getRequiredEtsyTaxonomyId(): number {
  const raw = process.env.ETSY_DEFAULT_TAXONOMY_ID?.trim()
  const n = raw ? Number(raw) : NaN
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(
      'Set ETSY_DEFAULT_TAXONOMY_ID to a seller taxonomy leaf id (Etsy Open API → Seller Taxonomy / listings tutorial).'
    )
  }
  return Math.trunc(n)
}

export async function resolveListingPolicyIds(
  shopId: string,
  accessToken: string,
  apiKey: string
): Promise<{ shippingProfileId: string; returnPolicyId: string }> {
  const shipEnv = process.env.ETSY_DEFAULT_SHIPPING_PROFILE_ID?.trim()
  const retEnv = process.env.ETSY_DEFAULT_RETURN_POLICY_ID?.trim()
  let shippingProfileId = shipEnv || ''
  let returnPolicyId = retEnv || ''

  if (!shippingProfileId) {
    const sp = await fetchShopShippingProfiles(shopId, accessToken, apiKey)
    const rows = (Array.isArray(sp.results) ? sp.results : []) as Record<string, unknown>[]
    shippingProfileId = pickFirstNumericId(rows, ['shipping_profile_id', 'shippingProfileId'])
  }
  if (!returnPolicyId) {
    const rp = await fetchShopReturnPolicies(shopId, accessToken, apiKey)
    const rows = (Array.isArray(rp.results) ? rp.results : []) as Record<string, unknown>[]
    returnPolicyId = pickFirstNumericId(rows, ['return_policy_id', 'returnPolicyId'])
  }

  if (!shippingProfileId) {
    throw new Error(
      'No Etsy shipping profile found. Create one in Etsy Shop Manager → Settings → Delivery, or set ETSY_DEFAULT_SHIPPING_PROFILE_ID.'
    )
  }
  if (!returnPolicyId) {
    throw new Error(
      'No Etsy return policy found. Configure returns in Shop Manager, or set ETSY_DEFAULT_RETURN_POLICY_ID.'
    )
  }

  return { shippingProfileId, returnPolicyId }
}

import 'server-only'

import { etsyFormPatchJson, etsyFormPostJson } from '@/lib/integrations/etsy/etsyOrdersClient'
import { getRequiredEtsyTaxonomyId, resolveListingPolicyIds } from '@/lib/integrations/etsy/etsyListingBootstrap'

function clampMarkup(percent: unknown, fallback: number): number {
  const n = typeof percent === 'number' && Number.isFinite(percent) ? percent : fallback
  return Math.min(100, Math.max(0, n))
}

function defaultMarkupPercent(): number {
  const raw = process.env.ETSY_LISTING_MARKUP_DEFAULT_PERCENT?.trim()
  const n = raw ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= 0) return clampMarkup(n, 15)
  return 15
}

export function etsyPriceFromSitePrice(sitePrice: number, markupPercent: number): number {
  const p = sitePrice * (1 + markupPercent / 100)
  return Math.round(p * 100) / 100
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1).trimEnd() + '...'
}

export async function createEtsyDraftPhysicalListing(params: {
  shopId: string
  accessToken: string
  apiKey: string
  title: string
  description: string
  sitePrice: number
  markupPercent?: number
  quantity: number
}): Promise<{ listingId: string }> {
  const markup = clampMarkup(params.markupPercent, defaultMarkupPercent())
  const price = etsyPriceFromSitePrice(params.sitePrice, markup)
  const taxonomyId = getRequiredEtsyTaxonomyId()
  const { shippingProfileId, returnPolicyId } = await resolveListingPolicyIds(
    params.shopId,
    params.accessToken,
    params.apiKey
  )

  const form = new URLSearchParams()
  form.set('quantity', String(Math.max(1, Math.min(999, Math.floor(params.quantity)))))
  form.set('title', truncate(params.title.replace(/\s+/g, ' ').trim(), 140))
  form.set('description', truncate(params.description.trim() || params.title, 65000))
  form.set('price', String(price))
  form.set('who_made', 'i_did')
  form.set('when_made', 'made_to_order')
  form.set('taxonomy_id', String(taxonomyId))
  form.set('shipping_profile_id', shippingProfileId)
  form.set('return_policy_id', returnPolicyId)
  form.set('type', 'physical')
  form.set('is_supply', 'false')

  const path = `/shops/${encodeURIComponent(params.shopId)}/listings`
  const created = await etsyFormPostJson<Record<string, unknown>>(
    path,
    form,
    params.accessToken,
    params.apiKey
  )
  const listingId = created.listing_id ?? created.listingId
  if (listingId == null) throw new Error('Etsy did not return listing_id for the new draft.')
  return { listingId: String(listingId) }
}

export async function updateEtsyListingFromSiteProduct(params: {
  shopId: string
  listingId: string
  accessToken: string
  apiKey: string
  title: string
  description: string
  sitePrice: number
  markupPercent?: number
  quantity?: number
}): Promise<void> {
  const markup = clampMarkup(params.markupPercent, defaultMarkupPercent())
  const price = etsyPriceFromSitePrice(params.sitePrice, markup)
  const form = new URLSearchParams()
  form.set('title', truncate(params.title.replace(/\s+/g, ' ').trim(), 140))
  form.set('description', truncate(params.description.trim() || params.title, 65000))
  form.set('price', String(price))
  if (params.quantity != null) {
    form.set('quantity', String(Math.max(1, Math.min(999, Math.floor(params.quantity)))))
  }
  const path = `/shops/${encodeURIComponent(params.shopId)}/listings/${encodeURIComponent(params.listingId)}`
  await etsyFormPatchJson(path, form, params.accessToken, params.apiKey)
}

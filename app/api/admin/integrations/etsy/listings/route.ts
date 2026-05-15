import { NextResponse } from 'next/server'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { getValidEtsyAccessToken } from '@/lib/integrations/etsy/etsyAccessToken'
import {
  createEtsyDraftPhysicalListing,
  updateEtsyListingFromSiteProduct,
  etsyPriceFromSitePrice,
} from '@/lib/integrations/etsy/etsyListingClient'
import { SAFE_API_ERROR_MESSAGE, logAndSafeMessage } from '@/lib/api/safeError'

export const runtime = 'nodejs'

type ProductPayload = {
  id: string
  name: string
  description?: string
  price: number
  stockQuantity?: number
  inStock?: boolean
  detailDescription?: string
}

function clampMarkup(percent: unknown, fallback: number): number {
  const n = typeof percent === 'number' && Number.isFinite(percent) ? percent : fallback
  return Math.min(100, Math.max(0, n))
}

function defaultMarkup(): number {
  const raw = process.env.ETSY_LISTING_MARKUP_DEFAULT_PERCENT?.trim()
  const n = raw ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= 0) return clampMarkup(n, 15)
  return 15
}

function quantityFromProduct(p: ProductPayload): number {
  if (typeof p.stockQuantity === 'number' && p.stockQuantity > 0) {
    return Math.min(999, Math.floor(p.stockQuantity))
  }
  return p.inStock === false ? 0 : 1
}

function buildDescription(product: ProductPayload): string {
  const parts = [product.description, product.detailDescription].filter(
    (x): x is string => typeof x === 'string' && x.trim().length > 0
  )
  return parts.join('\n\n').trim() || product.name
}

/**
 * POST — create Etsy draft listing from storefront product fields.
 * PATCH — update title/description/price (with markup) / quantity on an existing listing.
 */
export async function POST(request: Request) {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    product?: ProductPayload
    markupPercent?: number
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const product = body.product
  if (!product || typeof product.name !== 'string' || typeof product.price !== 'number') {
    return NextResponse.json({ error: 'Expected { product: { name, price, ... } }' }, { status: 400 })
  }

  const markup = clampMarkup(body.markupPercent, defaultMarkup())
  const qty = quantityFromProduct(product)
  if (qty < 1) {
    return NextResponse.json(
      { error: 'Product must have quantity ≥ 1 to publish as a draft listing.' },
      { status: 400 }
    )
  }

  try {
    const { accessToken, apiKey, shopId } = await getValidEtsyAccessToken()
    const desc = buildDescription(product)

    const { listingId } = await createEtsyDraftPhysicalListing({
      shopId,
      accessToken,
      apiKey,
      title: product.name,
      description: desc,
      sitePrice: product.price,
      markupPercent: markup,
      quantity: qty,
    })

    const etsyUnitPrice = etsyPriceFromSitePrice(product.price, markup)
    return NextResponse.json({
      ok: true,
      listingId,
      shopId,
      markupPercent: markup,
      sitePrice: product.price,
      etsyDraftUnitPrice: etsyUnitPrice,
    })
  } catch (e) {
    logAndSafeMessage('etsy listings POST', e)
    const msg = e instanceof Error ? e.message : SAFE_API_ERROR_MESSAGE
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    listingId?: string
    product?: ProductPayload
    markupPercent?: number
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const listingId = body.listingId?.trim()
  const product = body.product
  if (!listingId || !product || typeof product.name !== 'string' || typeof product.price !== 'number') {
    return NextResponse.json(
      { error: 'Expected { listingId, product: { name, price, ... } }' },
      { status: 400 }
    )
  }

  const markup = clampMarkup(body.markupPercent, defaultMarkup())
  const qty = quantityFromProduct(product)

  try {
    const { accessToken, apiKey, shopId } = await getValidEtsyAccessToken()
    const desc = buildDescription(product)

    await updateEtsyListingFromSiteProduct({
      shopId,
      listingId,
      accessToken,
      apiKey,
      title: product.name,
      description: desc,
      sitePrice: product.price,
      markupPercent: markup,
      quantity: qty >= 1 ? qty : undefined,
    })

    const etsyUnitPrice = etsyPriceFromSitePrice(product.price, markup)
    return NextResponse.json({
      ok: true,
      listingId,
      shopId,
      markupPercent: markup,
      sitePrice: product.price,
      etsyUnitPrice,
    })
  } catch (e) {
    logAndSafeMessage('etsy listings PATCH', e)
    const msg = e instanceof Error ? e.message : SAFE_API_ERROR_MESSAGE
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

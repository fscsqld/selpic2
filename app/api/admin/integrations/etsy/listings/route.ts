import { NextResponse } from 'next/server'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import { getValidEtsyAccessToken } from '@/lib/integrations/etsy/etsyAccessToken'
import {
  createEtsyDraftPhysicalListing,
  updateEtsyListingFromSiteProduct,
  resolveEtsyListingUnitPrice,
  type EtsyListingPricingMode,
} from '@/lib/integrations/etsy/etsyListingClient'
import { uploadListingImagesFromUrls } from '@/lib/integrations/etsy/etsyListingImageUpload'
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
  image?: string
  fallbackImage?: string
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

function resolveAssetUrl(url: string, assetBaseUrl: string | undefined): string {
  const u = url.trim()
  if (!u) return u
  if (u.startsWith('data:') || u.startsWith('http://') || u.startsWith('https://')) return u
  if (u.startsWith('//')) return `https:${u}`
  const base = (
    assetBaseUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    ''
  ).replace(/\/$/, '')
  if (u.startsWith('/') && base) return `${base}${u}`
  return u
}

function collectImageUrls(
  product: ProductPayload,
  extra: string[] | undefined,
  assetBaseUrl: string | undefined
): string[] {
  const raw: string[] = []
  if (product.image) raw.push(product.image)
  if (product.fallbackImage) raw.push(product.fallbackImage)
  if (Array.isArray(extra)) raw.push(...extra)
  const resolved = raw.map((x) => resolveAssetUrl(String(x), assetBaseUrl)).filter(Boolean)
  return [...new Set(resolved)]
}

function parsePricingMode(body: { pricingMode?: unknown }): EtsyListingPricingMode {
  return body.pricingMode === 'fixed_price' ? 'fixed_price' : 'markup_percent'
}

/**
 * POST — create Etsy draft listing from storefront product fields + upload listing images.
 * PATCH — update title/description/price / quantity (same pricing rules).
 */
export async function POST(request: Request) {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    product?: ProductPayload
    pricingMode?: EtsyListingPricingMode
    markupPercent?: number
    fixedEtsyPrice?: number
    imageUrls?: string[]
    assetBaseUrl?: string
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

  const pricingMode = parsePricingMode(body)
  const markup = clampMarkup(body.markupPercent, defaultMarkup())
  if (pricingMode === 'fixed_price') {
    if (typeof body.fixedEtsyPrice !== 'number' || !Number.isFinite(body.fixedEtsyPrice)) {
      return NextResponse.json(
        { error: 'When pricingMode is "fixed_price", pass a numeric fixedEtsyPrice (e.g. 19.99).' },
        { status: 400 }
      )
    }
  }

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
      pricingMode,
      markupPercent: markup,
      fixedEtsyPrice: body.fixedEtsyPrice,
      quantity: qty,
    })

    const etsyUnitPrice = resolveEtsyListingUnitPrice({
      sitePrice: product.price,
      pricingMode,
      markupPercent: markup,
      fixedEtsyPrice: body.fixedEtsyPrice,
    })

    const urls = collectImageUrls(product, body.imageUrls, body.assetBaseUrl?.trim())
    let uploadedImages = 0
    const imageUploadErrors: string[] = []
    if (urls.length > 0) {
      const up = await uploadListingImagesFromUrls({
        shopId,
        listingId,
        accessToken,
        apiKey,
        imageUrls: urls,
        productName: product.name,
      })
      uploadedImages = up.uploaded
      imageUploadErrors.push(...up.errors)
    }

    return NextResponse.json({
      ok: true,
      listingId,
      shopId,
      pricingMode,
      markupPercent: pricingMode === 'markup_percent' ? markup : undefined,
      fixedEtsyPrice: pricingMode === 'fixed_price' ? body.fixedEtsyPrice : undefined,
      sitePrice: product.price,
      etsyDraftUnitPrice: etsyUnitPrice,
      uploadedImages,
      imageUrlsAttempted: urls.length,
      imageUploadErrors,
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
    pricingMode?: EtsyListingPricingMode
    markupPercent?: number
    fixedEtsyPrice?: number
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

  const pricingMode = parsePricingMode(body)
  const markup = clampMarkup(body.markupPercent, defaultMarkup())
  if (pricingMode === 'fixed_price') {
    if (typeof body.fixedEtsyPrice !== 'number' || !Number.isFinite(body.fixedEtsyPrice)) {
      return NextResponse.json(
        { error: 'When pricingMode is "fixed_price", pass a numeric fixedEtsyPrice (e.g. 19.99).' },
        { status: 400 }
      )
    }
  }

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
      pricingMode,
      markupPercent: markup,
      fixedEtsyPrice: body.fixedEtsyPrice,
      quantity: qty >= 1 ? qty : undefined,
    })

    const etsyUnitPrice = resolveEtsyListingUnitPrice({
      sitePrice: product.price,
      pricingMode,
      markupPercent: markup,
      fixedEtsyPrice: body.fixedEtsyPrice,
    })

    return NextResponse.json({
      ok: true,
      listingId,
      shopId,
      pricingMode,
      markupPercent: pricingMode === 'markup_percent' ? markup : undefined,
      fixedEtsyPrice: pricingMode === 'fixed_price' ? body.fixedEtsyPrice : undefined,
      sitePrice: product.price,
      etsyUnitPrice,
    })
  } catch (e) {
    logAndSafeMessage('etsy listings PATCH', e)
    const msg = e instanceof Error ? e.message : SAFE_API_ERROR_MESSAGE
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
